/** Apply a reviewed proposal to an editor without saving or confirming anything. */
export function applyAIProposal(kind: string, existing: Record<string, any>, result: Record<string, any>, newId: () => string): { data: Record<string, any>; limited: boolean } {
  const data = { ...existing };
  let limited = false;
  const value = (input: unknown) => typeof input === 'string' ? input : '';
  const array = (input: unknown): any[] => Array.isArray(input) ? input : [];
  function bounded(input: unknown, max: number) {
    const original = value(input).trim();
    if (original.length > max) limited = true;
    let end = Math.min(original.length, max);
    if (end < original.length && /[\uD800-\uDBFF]/.test(original[end - 1] ?? '')) end--;
    return original.slice(0, end);
  }
  function chunks(input: unknown, prefix = '') {
    let remaining = value(input).trim();
    const output: string[] = [];
    const size = 300 - prefix.length;
    while (remaining) {
      let end = Math.min(remaining.length, size);
      if (end < remaining.length && /[\uD800-\uDBFF]/.test(remaining[end - 1] ?? '')) end--;
      output.push(prefix + remaining.slice(0, end));
      remaining = remaining.slice(end);
    }
    return output;
  }
  function appendUnique(current: unknown, additions: string[], retainRepeatedChunks = false) {
    const output = [...array(current)];
    const counts = new Map<string, number>();
    const requested = new Map<string, number>();
    for (const item of output) counts.set(item, (counts.get(item) ?? 0) + 1);
    for (const item of additions) {
      if (!item) continue;
      const target = retainRepeatedChunks ? (requested.get(item) ?? 0) + 1 : 1;
      requested.set(item, target);
      if ((counts.get(item) ?? 0) >= target) continue;
      if (output.length >= 100) { limited = true; continue; }
      counts.set(item, (counts.get(item) ?? 0) + 1); output.push(item);
    }
    return output;
  }
  const goal = result.goal && typeof result.goal === 'object' ? result.goal : {};
  if (kind === 'goal') {
    if (!value(data.title).trim()) data.title = bounded(goal.title, 300);
    if (!value(data.outcome).trim()) data.outcome = bounded(goal.outcome, 6000);
    if (!value(data.nextStep).trim()) data.nextStep = bounded(goal.nextStep, 300);
    data.unknowns = appendUnique(data.unknowns, array(result.unknowns).flatMap(unknown => chunks(unknown)), true);
    const actions = [...array(data.actions)];
    const usedIds = new Set(actions.map(action => action.id));
    const titles = new Set(actions.map(action => value(action.title).trim()));
    for (const action of array(result.actions)) {
      const title = bounded(action?.title, 300);
      if (!title || titles.has(title)) continue;
      if (actions.length >= 100) { limited = true; continue; }
      let id = '';
      for (let attempt = 0; attempt < 16; attempt++) {
        const candidate = newId();
        if (typeof candidate === 'string' && candidate.trim() && candidate.length <= 300 && !usedIds.has(candidate)) { id = candidate; break; }
      }
      if (!id) { limited = true; continue; }
      usedIds.add(id); titles.add(title);
      actions.push({ id, title, owner: 'Me', status: 'todo', dependsOn: [], evidence: '' });
    }
    data.actions = actions;
    data.evidence = appendUnique(data.evidence, array(result.sources).map(source => bounded(source?.sourceId, 300)));
    const actionLines = array(result.actions).map(action => {
      const ids = array(action?.sourceIds).filter(id => typeof id === 'string');
      return `${value(action?.title)} — ${value(action?.why)} [${value(action?.basis)}${ids.length ? ': ' + ids.join(', ') : ''}]`;
    });
    const block = ['AI proposal · review before relying on it', value(result.summary), ...actionLines].filter(Boolean).join('\n');
    const draft = value(data.draft);
    if (!draft.includes(block)) {
      const addition = (draft ? '\n' : '') + block;
      if (draft.length + addition.length <= 6000) data.draft = draft + addition;
      else limited = true;
    }
  } else if (kind === 'proof') {
    data.gaps = appendUnique(data.gaps, [
      ...array(result.unknowns).flatMap(unknown => chunks(unknown)),
      ...chunks(result.feedback, 'AI feedback · '),
    ], true);
  } else if (kind === 'request') {
    const draft = bounded(result.draft, 6000);
    if (draft) data.question = draft;
    if (!value(data.title).trim()) data.title = bounded(goal.title, 300);
  }
  return { data, limited };
}
