'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './ai-assistant.css';

type Mode = 'goal' | 'request' | 'proof';
type Props = {
  mode: Mode;
  sources: any[];
  initialInput?: string;
  workspaceId?: string;
  available: boolean;
  disabled?: boolean;
  onApply?: (result: any) => void;
};
type Result = {
  summary?: string;
  goal?: { title?: string; outcome?: string; nextStep?: string };
  unknowns?: string[];
  actions?: { title?: string; why?: string; basis?: string; sourceIds?: string[] }[];
  sources?: { sourceId?: string; fit?: string; uncertainty?: string }[];
  draft?: string;
  feedback?: string;
};
type Answer = {
  result: Result;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  generatedAt?: string;
  sourceIds: string[];
  signature: string;
};

const copy: Record<Mode, { heading: string; description: string; placeholder: string; generate: string }> = {
  goal: {
    heading: 'Find a practical next step',
    description: 'Turn the context you choose into an editable goal proposal, with sources and unknowns kept visible.',
    placeholder: 'What do you want to achieve? What is known, and what is still blocking you?',
    generate: 'Generate goal proposal',
  },
  request: {
    heading: 'Make your small ask clear',
    description: 'Draft a focused question from the blocker and context you choose to share.',
    placeholder: 'Describe the unresolved question and the details you want included in the draft.',
    generate: 'Draft my question',
  },
  proof: {
    heading: 'Review your proof of work',
    description: 'Get a proposal for clearer evidence and visible gaps. AI feedback is separate from human review.',
    placeholder: 'Describe your contribution, the requirements and the evidence you want feedback on. Include only details you choose to send.',
    generate: 'Review my evidence',
  },
};

function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function safeUrl(value: unknown): string | null {
  try { const url = new URL(text(value)); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}
function safeError(status: number, error: unknown): string {
  const message = typeof error === 'string' && error.length < 500 ? error : '';
  if (status === 403) return message || 'Sign in and check that you can access this workspace before generating a proposal.';
  if (status === 429) return message || 'The request limit has been reached. Please wait before trying again.';
  if (status === 503) return message || 'AI is currently unavailable. Your context has been kept so you can continue editing.';
  if (status === 400) return message || 'Check your context and selected sources, then try again.';
  return 'The proposal could not be generated. Your context has been kept. Please try again when you are ready.';
}

export default function AiAssistant({ mode, sources, initialInput = '', workspaceId, available, disabled = false, onApply }: Props) {
  const id = useId();
  const labels = copy[mode];
  const [input, setInput] = useState(initialInput);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null);
  const requestLock = useRef(false);
  const mounted = useRef(true);
  const disabledNow = useRef(disabled);
  disabledNow.current = disabled;
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return sources.filter(source => {
      if (!source || typeof source.id !== 'string' || !text(source.title) || !safeUrl(source.url) || seen.has(source.id)) return false;
      if (source.status && source.status !== 'available') return false;
      seen.add(source.id); return true;
    });
  }, [sources]);
  const sourceMap = useMemo(() => new Map<string, any>(candidates.map(source => [source.id, source])), [candidates]);
  const selectedIds = sourceIds.filter(sourceId => sourceMap.has(sourceId));
  const signature = JSON.stringify({ mode, input: input.trim(), sourceIds: selectedIds, workspaceId, evidence: selectedIds.map(sourceId => {
    const source = sourceMap.get(sourceId);
    return { id: sourceId, version: source.version, title: source.title, summary: source.summary, url: source.url };
  }) });
  const stale = answer !== null && answer.signature !== signature;
  const currentSignature = useRef(signature);
  currentSignature.current = signature;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  function toggleSource(sourceId: string) {
    if (disabledNow.current || requestLock.current) return;
    setError(''); setNotice('');
    setSourceIds(current => {
      const retained = current.filter(value => sourceMap.has(value));
      return retained.includes(sourceId) ? retained.filter(value => value !== sourceId) : retained.length < 6 ? [...retained, sourceId] : retained;
    });
  }
  function cancel() {
    controller.current?.abort();
    setNotice('Generation cancelled. Your context and source choices are kept.');
  }
  async function generate() {
    if (disabledNow.current || requestLock.current || !available) return;
    if (!input.trim()) { setError('Add the context you want to send before generating a proposal.'); return; }
    if (input.length > 6000) { setError('Shorten your selected context to 6,000 characters before generating a proposal.'); return; }
    requestLock.current = true;
    setBusy(true); setError(''); setNotice('');
    const request = new AbortController();
    controller.current = request;
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; request.abort(); }, 40_000);
    const requestSignature = signature;
    const requestedIds = [...selectedIds];
    try {
      const response = await fetch('/api/ai', {
        method: 'POST', credentials: 'same-origin', signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, input: input.trim(), sourceIds: requestedIds, ...(workspaceId ? { workspaceId } : {}) }),
      });
      let payload: any;
      try { payload = await response.json(); } catch { throw new Error('The server returned an unreadable response. Your context has been kept.'); }
      if (request.signal.aborted) return;
      if (!response.ok) throw new Error(safeError(response.status, payload?.error));
      if (payload?.live !== true || !payload.result || typeof payload.result !== 'object' || Array.isArray(payload.result)) {
        throw new Error('A live AI proposal was not returned. Your context has been kept.');
      }
      const returnedIds = strings(payload.sourceIds).filter(sourceId => requestedIds.includes(sourceId));
      if (mounted.current) setAnswer({ result: payload.result, model: text(payload.model), usage: payload.usage, generatedAt: text(payload.generatedAt), sourceIds: returnedIds, signature: requestSignature });
    } catch (failure) {
      if (!mounted.current) return;
      if (request.signal.aborted) {
        if (timedOut) setError('Generation timed out after 40 seconds. Your context has been kept. Please try again when you are ready.');
      } else setError(failure instanceof Error ? failure.message : 'Could not reach AI. Your context has been kept.');
    } finally {
      window.clearTimeout(timer);
      requestLock.current = false;
      if (controller.current === request) controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  const result = answer?.result;
  function citations(ids: unknown) {
    const valid = [...new Set(strings(ids))].filter(sourceId => answer?.sourceIds.includes(sourceId) && sourceMap.has(sourceId));
    if (!valid.length) return null;
    return <span className="suhba-ai-citations">{valid.map(sourceId => {
      const source = sourceMap.get(sourceId);
      return <a key={sourceId} href={safeUrl(source.url)!} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>;
    })}</span>;
  }
  const actions = Array.isArray(result?.actions) ? result.actions.filter(action => action && typeof action === 'object') : [];
  const fits = Array.isArray(result?.sources) ? result.sources.filter(source => source && typeof source === 'object' && answer?.sourceIds.includes(text(source.sourceId)) && sourceMap.has(text(source.sourceId))) : [];
  const unknowns = strings(result?.unknowns);

  return <section className="suhba-ai" aria-labelledby={`${id}-heading`}>
    <div className="suhba-ai-heading"><span className="suhba-ai-eyebrow">AI · YOUR CONTEXT, YOUR CHOICE</span><h3 id={`${id}-heading`}>{labels.heading}</h3><p>{labels.description}</p></div>
    {!available && <p className="suhba-ai-unavailable" role="status">AI credentials are not configured. You can keep editing this workspace yourself.</p>}
    <label className="suhba-ai-label" htmlFor={`${id}-context`}>Context to send</label>
    <textarea id={`${id}-context`} rows={5} maxLength={6000} value={input} disabled={busy || disabled} placeholder={labels.placeholder} aria-describedby={`${id}-privacy ${id}-count`} onChange={event => { if (disabledNow.current || requestLock.current) return; setInput(event.target.value); setError(''); setNotice(''); }}/>
    <p id={`${id}-count`} className="suhba-ai-count">{input.length.toLocaleString()} / 6,000 characters{input.length > 6000 ? ' · Shorten the context to generate.' : ''}</p>
    <fieldset className="suhba-ai-source-picker" disabled={busy || disabled}>
      <legend>Sources to include <span>{selectedIds.length} / 6</span></legend>
      <p>Choose the sources you want the proposal to consider. Zero sources is allowed; source-backed claims then remain unavailable.</p>
      {candidates.length ? <div className="suhba-ai-source-list">{candidates.map(source => {
        const checked = selectedIds.includes(source.id);
        return <label key={source.id} className={checked ? 'suhba-ai-source selected' : 'suhba-ai-source'}>
          <input type="checkbox" checked={checked} disabled={busy || disabled || (!checked && selectedIds.length >= 6)} onChange={() => toggleSource(source.id)}/>
          <span><strong>{source.title}</strong><small>{text(source.creator) || 'Original publisher'} · {text(source.type) || 'Editorial source'}</small></span>
        </label>;
      })}</div> : <p className="suhba-ai-empty">No available sources in this selection. Describe the context you want help with, or return to Discover to find evidence.</p>}
    </fieldset>
    <p id={`${id}-privacy`} className="suhba-ai-privacy">Only this text and the selected editorial source summaries are sent to OpenAI when you generate. Your profile and private notes are not added automatically. Include only details you choose to share.</p>
    <div className="suhba-ai-controls"><button type="button" className="suhba-ai-generate" disabled={disabled || busy || !available || !input.trim() || input.length > 6000} onClick={generate}>{busy ? 'Generating…' : labels.generate}</button>{busy && <button type="button" onClick={cancel}>Cancel generation</button>}</div>
    {disabled && <p className="suhba-ai-status" role="status">Workspace save in progress. AI editing and proposal application are paused.</p>}
    {busy && <p className="suhba-ai-status" role="status" aria-live="polite">Preparing a source-grounded proposal. Nothing is saved automatically.</p>}
    {error && <p className="suhba-ai-error" role="alert">{error}</p>}
    {notice && <p className="suhba-ai-status" role="status">{notice}</p>}
    {answer && result && <div className="suhba-ai-answer" aria-label="AI proposal">
      <div className="suhba-ai-answer-top"><span className="suhba-ai-live">Live AI proposal</span>{answer.model && <small>{answer.model}</small>}</div>
      <p className="suhba-ai-review">Review this proposal before using it. AI can make mistakes; source links do not confirm eligibility, availability or an outcome. Calculations stay in the deterministic planner.</p>
      {stale && <p className="suhba-ai-stale" role="status">Your context or source choices have changed. Generate again to apply a proposal for the current selection.</p>}
      {text(result.summary) && <p className="suhba-ai-summary">{text(result.summary)}</p>}
      {result.goal && (text(result.goal.title) || text(result.goal.outcome) || text(result.goal.nextStep)) && <div className="suhba-ai-proposed-goal"><h4>Proposed goal</h4>{text(result.goal.title) && <p><strong>{text(result.goal.title)}</strong></p>}{text(result.goal.outcome) && <p><b>Outcome:</b> {text(result.goal.outcome)}</p>}{text(result.goal.nextStep) && <p><b>Next step:</b> {text(result.goal.nextStep)}</p>}</div>}
      {unknowns.length > 0 && <div className="suhba-ai-unknowns"><h4>Still unknown</h4><ul>{unknowns.map((unknown, index) => <li key={index}>{unknown}</li>)}</ul></div>}
      {actions.length > 0 && <div className="suhba-ai-actions"><h4>Suggested actions</h4><ol>{actions.map((action, index) => <li key={index}><strong>{text(action.title)}</strong>{text(action.why) && <p>{text(action.why)}</p>}{text(action.basis) && <small>Basis: {text(action.basis)}</small>}{citations(action.sourceIds)}</li>)}</ol></div>}
      {fits.length > 0 && <div className="suhba-ai-fits"><h4>How the sources may fit</h4>{fits.map((fit, index) => <div key={index}>{citations([fit.sourceId])}{text(fit.fit) && <p>{text(fit.fit)}</p>}{text(fit.uncertainty) && <p className="suhba-ai-uncertainty"><b>Uncertainty:</b> {text(fit.uncertainty)}</p>}</div>)}</div>}
      {text(result.draft) && <div className="suhba-ai-draft"><h4>Editable inquiry draft</h4><p>{text(result.draft)}</p><small>This draft has not been sent to anyone.</small></div>}
      {text(result.feedback) && <div className="suhba-ai-feedback"><h4>Feedback to review</h4><p>{text(result.feedback)}</p><small>AI feedback does not count as human review or endorsement.</small></div>}
      <div className="suhba-ai-answer-footer">{typeof answer.usage?.inputTokens === 'number' && typeof answer.usage?.outputTokens === 'number' && <small>{answer.usage.inputTokens} input tokens · {answer.usage.outputTokens} output tokens</small>}{onApply && <button type="button" className="suhba-ai-apply" disabled={disabled || busy || stale} onClick={() => { if (disabledNow.current || requestLock.current || answer.signature !== currentSignature.current) return; onApply(result); setNotice('Proposal added to the editor for your review. Use the workspace Save button when you are ready.'); }}>Use this editable proposal</button>}</div>
    </div>}
  </section>;
}
