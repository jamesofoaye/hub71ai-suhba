import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
async function load(path) {
  const js = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(createRequire(import.meta.url), module, module.exports);
  return module.exports;
}
const { applyAIProposal } = await load('lib/ai-apply.ts');
const { validate } = await load('lib/model.ts');
const { AIResultSchema } = await load('lib/ai.ts');
let sequence = 0;
const newId = () => `generated-${++sequence}`;
const result = AIResultSchema.parse({
  summary: 's'.repeat(1800), goal: { title: 't'.repeat(160), outcome: 'o'.repeat(1200), nextStep: 'n'.repeat(300) },
  unknowns: Array.from({ length: 12 }, (_, i) => `${String(i).padStart(2, '0')}:` + 'u'.repeat(497)),
  actions: Array.from({ length: 8 }, (_, i) => ({ title: `${i}:` + 'a'.repeat(198), why: 'w'.repeat(700), basis: 'source', sourceIds: ['source-0'] })),
  sources: Array.from({ length: 6 }, (_, i) => ({ sourceId: `source-${i}`, fit: 'f'.repeat(700), uncertainty: 'c'.repeat(700) })),
  draft: 'd'.repeat(3000), feedback: 'b'.repeat(2000),
});
const base = validate('goal', { title: 'My goal', outcome: 'My outcome', nextStep: 'My agreed step', draft: 'x'.repeat(6000), privateNotes: 'Private sentinel', confirmed: true, confirmationEvidence: 'Actual evidence', actions: [{ id: 'existing', title: 'Confirmed action', status: 'done', evidence: 'Actual contribution' }] });
const snapshot = structuredClone(base);
const applied = applyAIProposal('goal', base, result, newId);
validate('goal', applied.data);
assert.equal(applied.limited, true);
for (const key of ['title', 'outcome', 'nextStep', 'draft', 'privateNotes', 'confirmed', 'confirmationEvidence']) assert.deepEqual(applied.data[key], base[key]);
assert.deepEqual(base, snapshot);
assert.deepEqual(applied.data.actions[0], base.actions[0]);
assert.ok(applied.data.actions.slice(1).every(action => action.status === 'todo' && action.evidence === '' && action.dependsOn.length === 0));
assert.ok(applied.data.unknowns.every(item => item.length <= 300));
const repeated = applyAIProposal('goal', applied.data, result, newId);
validate('goal', repeated.data);
assert.deepEqual(repeated.data, applied.data);
const near = validate('goal', { title: 'Near capacity', unknowns: Array.from({ length: 99 }, (_, i) => `existing unknown ${i}`), evidence: Array.from({ length: 99 }, (_, i) => `existing source ${i}`), actions: Array.from({ length: 99 }, (_, i) => ({ id: `action-${i}`, title: `Existing action ${i}`, status: 'todo' })) });
const capped = applyAIProposal('goal', near, result, newId);
validate('goal', capped.data);
assert.equal(capped.data.unknowns.length, 100); assert.equal(capped.data.actions.length, 100); assert.equal(capped.data.evidence.length, 100); assert.equal(capped.limited, true);
assert.deepEqual(capped.data.unknowns.slice(0, 99), near.unknowns);
const proof = validate('proof', { title: 'My proof', artifact: 'Original artifact', contribution: 'Actual contribution', privateNotes: 'Private proof note', review: 'reviewed', reviewer: 'Real reviewer', reviewEvidence: 'Actual review', reviewHash: 'actual-hash', gaps: ['Existing gap'] });
const reviewed = applyAIProposal('proof', proof, result, newId);
validate('proof', reviewed.data);
for (const key of Object.keys(proof).filter(key => key !== 'gaps')) assert.deepEqual(reviewed.data[key], proof[key]);
assert.ok(reviewed.data.gaps.every(item => item.length <= 300));
assert.ok(reviewed.data.gaps.some(item => item.startsWith('AI feedback · ')));
assert.equal(reviewed.data.gaps.filter(item => item.startsWith('AI feedback · ')).map(item => item.slice('AI feedback · '.length)).join(''), result.feedback);
assert.deepEqual(applyAIProposal('proof', reviewed.data, result, newId).data, reviewed.data);
const proofNear = { ...proof, gaps: Array.from({ length: 99 }, (_, i) => `Existing gap ${i}`) };
const proofCapped = applyAIProposal('proof', proofNear, result, newId);
validate('proof', proofCapped.data); assert.equal(proofCapped.data.gaps.length, 100); assert.equal(proofCapped.limited, true);
const request = validate('request', { title: 'My ask', question: 'Old question', status: 'accepted', helperId: 'real-helper', context: 'Chosen shared context', replies: [{ author: 'real-helper', text: 'Actual reply', at: 'Known timestamp' }] });
const drafted = applyAIProposal('request', request, result, newId);
validate('request', drafted.data); assert.equal(drafted.data.question, result.draft);
for (const key of Object.keys(request).filter(key => key !== 'question')) assert.deepEqual(drafted.data[key], request[key]);
const smallResult = { ...result, summary: 'A concise proposal', actions: [] };
const small = applyAIProposal('goal', { ...base, draft: 'Keep this exact original\n' }, smallResult, newId);
assert.ok(small.data.draft.startsWith('Keep this exact original\n'));
assert.ok(small.data.draft.includes('AI proposal · review before relying on it'));
assert.deepEqual(applyAIProposal('goal', small.data, smallResult, newId).data, small.data);
console.log('PASS AI apply: max valid output accepted by workspace validation; list caps, whole-draft preservation, repeated application, private notes, confirmations, existing next steps, action statuses and human review preserved.');
