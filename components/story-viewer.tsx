'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import './story-viewer.css';

export type StorySource = {
  id: string; title: string; url: string; platform: string; creator: string;
  nativeEmbedApproved?: boolean; status?: string;
  [key: string]: any;
};
type Props = {
  sources: StorySource[];
  renderMedia: (source: StorySource) => ReactNode;
  onExplore: (source: StorySource) => void;
  onSave: (source: StorySource) => void | Promise<unknown>;
  isSaved: (source: StorySource) => boolean;
};
function mediaLabel(source: StorySource) {
  if (source.platform === 'Instagram') return /\/(reel|reels)\//i.test(source.url) ? 'Video reel' : 'Instagram post / carousel';
  return source.platform === 'TikTok' ? 'TikTok video' : 'YouTube video';
}
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'S'; }

export default function StoryViewer({ sources, renderMedia, onExplore, onSave, isSaved }: Props) {
  const stories = useMemo(() => sources.filter(source => ['TikTok', 'Instagram', 'YouTube'].includes(source.platform) && source.status !== 'withdrawn'), [sources]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const index = stories.findIndex(source => source.id === selectedId);
  const current = index >= 0 ? stories[index] : null;
  function close() { setSelectedId(null); setSaveError(''); }
  function advance(direction: number) {
    const next = index + direction;
    if (next >= 0 && next < stories.length) { setSelectedId(stories[next].id); setSaveError(''); }
  }
  useEffect(() => {
    if (!selectedId) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = oldOverflow; openerRef.current?.focus(); };
  }, [!!selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    if (!current) { setSelectedId(null); return; }
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      const element = event.target as HTMLElement;
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea, iframe, [tabindex="0"]') ?? []).filter(control => control.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
      if (element.matches('input, textarea, select, iframe') || element.isContentEditable) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); advance(event.key === 'ArrowLeft' ? -1 : 1); }
    }
    function containFocus(event: FocusEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) closeRef.current?.focus();
    }
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', containFocus);
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('focusin', containFocus); };
  }, [selectedId, index, stories]);
  async function save() {
    if (!current || saving) return;
    setSaving(true); setSaveError('');
    try { await onSave(current); } catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
    finally { setSaving(false); }
  }
  if (!stories.length) return null;
  return <section className="suhba-stories" aria-labelledby="suhba-stories-heading">
    <div className="suhba-stories-intro"><div><span className="eyebrow">A WINDOW INTO THE EVERYDAY</span><h2 id="suhba-stories-heading">Stories from the city</h2></div><p>Browse creator videos and posts. Load originals when you’re ready.</p></div>
    <div className="suhba-story-rail" aria-label="Creator stories">
      {stories.map(source => <button type="button" key={source.id} className="suhba-story-trigger" aria-label={`Browse ${source.title} by ${source.creator}, ${mediaLabel(source)}`} aria-haspopup="dialog" onClick={event => { openerRef.current = event.currentTarget; setSelectedId(source.id); }}>
        <span className="suhba-story-avatar" aria-hidden="true"><span>{initials(source.creator)}</span><small>{source.platform === 'Instagram' ? 'IG' : source.platform === 'TikTok' ? 'TT' : 'YT'}</small></span>
        <strong>{source.creator}</strong><span>{source.title}</span><small>{mediaLabel(source)} · {source.nativeEmbedApproved ? 'Native embed' : 'Original link'}</small>
      </button>)}
    </div>
    {current && <div className="suhba-story-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="suhba-story-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="suhba-story-title" aria-describedby="suhba-story-description" onTouchStart={event => { const touch = event.touches[0]; touchRef.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={event => {
        const start = touchRef.current; touchRef.current = null;
        if (!start || !event.changedTouches[0]) return;
        const target = event.target as HTMLElement;
        if (target.closest('button, a, input, textarea, select, iframe')) return;
        const deltaX = event.changedTouches[0].clientX - start.x, deltaY = event.changedTouches[0].clientY - start.y;
        if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) advance(deltaX < 0 ? 1 : -1);
      }}>
        <div className="suhba-story-top"><span aria-live="polite" aria-atomic="true">Story {index + 1} of {stories.length}</span><button type="button" ref={closeRef} aria-label="Close stories" onClick={close}>Close ×</button></div>
        <div className="suhba-story-progress" aria-hidden="true">{stories.map((source, position) => <span key={source.id} className={position === index ? 'current' : position < index ? 'previous' : ''}/>)}</div>
        <div className="suhba-story-heading"><span className="suhba-story-platform">{current.platform} · {mediaLabel(current)}</span><h2 id="suhba-story-title">{current.title}</h2><p>By <strong>{current.creator}</strong></p></div>
        <p id="suhba-story-description" className="suhba-story-description">Original creator content. Use the arrows or swipe to browse. Provider media loads only when you choose to load it.</p>
        <div className="suhba-story-media" key={current.id}>{current.nativeEmbedApproved && current.status !== 'broken' ? renderMedia(current) : <div className="suhba-story-fallback"><span aria-hidden="true">↗</span><h3>Explore the original</h3><p>{current.status === 'broken' ? 'This source has been reported unavailable.' : 'An approved native embed is not available for this source.'} Open the original on {current.platform} to check availability.</p></div>}</div>
        <p className="suhba-story-provider-note">Provider login, age restrictions, removed posts or browser settings may prevent media loading. The original link remains available. Suhba does not copy or host this media.</p>
        <div className="suhba-story-actions"><a className="suhba-story-original" href={current.url} target="_blank" rel="noopener noreferrer">Open original ↗</a><button type="button" disabled={saving} aria-pressed={isSaved(current)} onClick={save}>{saving ? 'Saving…' : isSaved(current) ? 'Saved · remove' : 'Save source'}</button><button type="button" onClick={() => { const source = current; close(); onExplore(source); }}>Source details</button></div>
        {saveError && <p role="alert">{saveError}</p>}
        <nav className="suhba-story-navigation" aria-label="Story navigation"><button type="button" disabled={index === 0} onClick={() => advance(-1)}>← Previous</button><span>{index + 1} / {stories.length}</span><button type="button" disabled={index === stories.length - 1} onClick={() => advance(1)}>Next →</button></nav>
      </div>
    </div>}
  </section>;
}
