// AI contract checks use fixture sources and mocked Responses API calls only.
// They do not establish that a live OpenAI account or deployment is connected.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const js = ts.transpileModule(await readFile('lib/ai.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiled = { exports: {} };
new Function('require', 'module', 'exports', js)(createRequire(import.meta.url), compiled, compiled.exports);
const { AI_MODEL, AI_MAX_OUTPUT_TOKENS, AI_MAX_REQUEST_BYTES, AI_MAX_INPUT_BYTES, AI_RESERVE_SQL, AIRequestSchema, AIResultSchema, readAIRequest, buildAIRequest, validateAIResult, extractAIOutput, requestAI, AIError } = compiled.exports;

const request = { mode: 'goal', input: 'I want to shortlist neighbourhoods. My commute time is unknown.', sourceIds: ['official-housing', 'creator-neighbourhood'] };
const sourceData = [
  {
    id: 'official-housing',
    title: 'Fixture official housing guidance',
    url: 'https://example.org/official-housing',
    creator: 'Fixture official publisher',
    summary: 'Confirm tenancy documentation using the official service.',
    type: 'official guidance',
    status: 'available',
    published: null,
    checked: '2026-10-02',
    claims: [{ text: 'Confirm current documents with the official service.', basis: 'official guidance', citation: 'official-housing' }],
    privateNotes: 'PRIVATE_SOURCE_FIELD_MUST_NOT_ENTER_PROVIDER_PAYLOAD',
  },
  {
    id: 'creator-neighbourhood',
    title: 'Fixture creator neighbourhood experience',
    url: 'https://example.org/creator-neighbourhood',
    creator: 'Fixture creator',
    summary: 'A personal account of choosing a neighbourhood around daily travel.',
    type: 'personal experience',
    status: 'available',
    published: null,
    checked: '2026-10-02',
    caveat: 'Personal circumstances differ; current prices and availability are unknown.',
    claims: [],
  },
].map(({ id, ...data }) => ({ id, data }));

const resultFixture = {
  summary: 'Start a shortlist, preserving the unknown commute time.',
  goal: { title: 'Shortlist neighbourhoods', outcome: 'A shortlist with questions and cited evidence.', nextStep: 'Confirm commute requirements.' },
  unknowns: ['Current commute time', 'Current availability and costs'],
  actions: [
    { title: 'Check tenancy documents', why: 'The supplied official guidance recommends confirming documentation.', basis: 'source', sourceIds: ['official-housing'] },
    { title: 'Compare daily travel', why: 'The creator account is a personal experience with different circumstances.', basis: 'source', sourceIds: ['creator-neighbourhood'] },
    { title: 'Record commute needs', why: 'The explicit input says the commute time is unknown.', basis: 'user input', sourceIds: [] },
    { title: 'Keep a flexible shortlist', why: 'This is a planning suggestion to review.', basis: 'assumption', sourceIds: [] },
  ],
  sources: [
    { sourceId: 'official-housing', fit: 'Supports the tenancy documentation question.', uncertainty: 'Current service requirements must be confirmed.' },
    { sourceId: 'creator-neighbourhood', fit: 'Provides lived experience of neighbourhood trade-offs.', uncertainty: 'The creator circumstances may differ.' },
  ],
  draft: 'What current documents should I confirm before choosing a tenancy?',
  feedback: 'The commute requirement is still unknown.',
};

function mockResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function providerResponse(result) {
  return {
    id: 'resp_mock_contract_only',
    status: 'completed',
    model: 'gpt-5.4-mini-2026-03-17',
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(result) }] }],
    usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200 },
  };
}

function hasSafeError(error) {
  assert.ok(error instanceof AIError);
  assert.equal(JSON.stringify(error).includes('PROVIDER_PRIVATE_ERROR_DETAIL'), false);
  assert.equal(String(error.message).includes('PROVIDER_PRIVATE_ERROR_DETAIL'), false);
  assert.equal(String(error.message).includes('not-a-real-key-test-fixture'), false);
  return true;
}

const normalized = AIRequestSchema.parse({ ...request, input: '   Find a neighbourhood   ' });
assert.equal(normalized.input, 'Find a neighbourhood');
assert.throws(() => AIRequestSchema.parse({ ...request, privateNotes: 'UNSELECTED_PRIVATE_NOTES' }));
assert.throws(() => AIRequestSchema.parse({ ...request, apiKey: 'not-a-real-key-test-fixture' }));
assert.throws(() => AIRequestSchema.parse({ ...request, input: '   ' }));
assert.throws(() => AIRequestSchema.parse({ ...request, input: 'x'.repeat(6001) }));
assert.throws(() => AIRequestSchema.parse({ ...request, mode: 'planner' }));
assert.throws(() => AIRequestSchema.parse({ ...request, sourceIds: ['duplicate', 'duplicate'] }));
assert.throws(() => AIRequestSchema.parse({ ...request, sourceIds: Array.from({ length: 7 }, (_, i) => `source-${i}`) }));
assert.throws(() => AIRequestSchema.parse({ ...request, workspaceId: 'x'.repeat(101) }));
for (const mode of ['goal', 'request', 'proof']) assert.equal(AIRequestSchema.parse({ ...request, mode, sourceIds: [] }).mode, mode);
console.log('PASS mocked AI request contract: bounded explicit input, source limits, duplicate rejection and no automatic private fields');

const payload = buildAIRequest(request, sourceData);
assert.equal(payload.model, AI_MODEL);
assert.equal(AI_MODEL, 'gpt-5.4-mini-2026-03-17');
assert.equal(payload.store, false);
assert.equal(payload.max_output_tokens, AI_MAX_OUTPUT_TOKENS);
assert.equal(AI_MAX_OUTPUT_TOKENS, 1800);
assert.equal(payload.reasoning.effort, 'none');
assert.equal(payload.text.format.type, 'json_schema');
assert.equal(payload.text.format.strict, true);
assert.equal(payload.text.format.schema.additionalProperties, false);
const serializedPayload = JSON.stringify(payload);
assert.ok(serializedPayload.includes('official-housing'));
assert.ok(serializedPayload.includes('creator-neighbourhood'));
assert.equal(serializedPayload.includes('PRIVATE_SOURCE_FIELD_MUST_NOT_ENTER_PROVIDER_PAYLOAD'), false);
assert.equal(serializedPayload.includes('not-a-real-key-test-fixture'), false);
const longSource = structuredClone(sourceData);
longSource[0].data.summary = 'SOURCE_TRUNCATION_FIXTURE'.repeat(3000);
longSource[0].data.claims = Array.from({ length: 100 }, () => ({ text: 'CLAIM_TRUNCATION_FIXTURE'.repeat(1000), basis: 'official guidance', citation: 'official-housing' }));
assert.ok(JSON.stringify(buildAIRequest(request, longSource)).length < 50000, 'Provider context must have a bounded projection, including claims.');
assert.equal(AI_MAX_INPUT_BYTES, 32000);
const escapedInput = { ...request, input: '\u0000'.repeat(6000) };
assert.throws(() => buildAIRequest(escapedInput, sourceData), error => hasSafeError(error) && error.code === 'invalid_request');
const unicodeSources = Array.from({ length: 6 }, (_, i) => ({ id: `unicode-fixture-${i}`, data: {
  title: '漢'.repeat(200), creator: '漢'.repeat(150), topic: '漢'.repeat(80), summary: '漢'.repeat(900),
  type: 'official guidance', caveat: '漢'.repeat(300), contradictions: '漢'.repeat(300),
  claims: Array.from({ length: 4 }, () => ({ text: '漢'.repeat(300), basis: 'official guidance', citation: `unicode-fixture-${i}` })),
} }));
assert.throws(() => buildAIRequest({ ...request, sourceIds: unicodeSources.map(source => source.id) }, unicodeSources), error => hasSafeError(error) && error.code === 'invalid_request');
let oversizedProviderCalls = 0;
await assert.rejects(requestAI(escapedInput, sourceData, 'not-a-real-key-test-fixture', async () => { oversizedProviderCalls++; return mockResponse({}); }), error => hasSafeError(error) && error.code === 'invalid_request');
assert.equal(oversizedProviderCalls, 0, 'Over-budget prompts must fail before any provider call.');
console.log('PASS mocked AI payload: dated economical model, strict structured output, no storage, bounded context and explicit source projection');

assert.deepEqual(AIResultSchema.parse(resultFixture), resultFixture);
assert.deepEqual(validateAIResult(resultFixture, request.sourceIds), resultFixture);
const explicitInputOnly = { ...structuredClone(resultFixture), sources: [], actions: resultFixture.actions.filter(action => action.basis !== 'source') };
assert.deepEqual(validateAIResult(explicitInputOnly, []), explicitInputOnly);
const invalidCitation = structuredClone(resultFixture);
invalidCitation.actions[0].sourceIds = ['invented-source'];
assert.throws(() => validateAIResult(invalidCitation, request.sourceIds), hasSafeError);
const sourceNotDeclared = structuredClone(resultFixture);
sourceNotDeclared.sources = sourceNotDeclared.sources.slice(1);
assert.throws(() => validateAIResult(sourceNotDeclared, request.sourceIds), hasSafeError);
const inventedSource = structuredClone(resultFixture);
inventedSource.sources[0].sourceId = 'invented-source';
assert.throws(() => validateAIResult(inventedSource, request.sourceIds), hasSafeError);
const duplicateSource = structuredClone(resultFixture);
duplicateSource.sources.push(structuredClone(duplicateSource.sources[0]));
assert.throws(() => validateAIResult(duplicateSource, request.sourceIds), hasSafeError);
const uncitedSourceAction = structuredClone(resultFixture);
uncitedSourceAction.actions[0].sourceIds = [];
assert.throws(() => validateAIResult(uncitedSourceAction, request.sourceIds), hasSafeError);
for (const basis of ['user input', 'assumption']) {
  const misattributed = structuredClone(resultFixture);
  misattributed.actions[0].basis = basis;
  assert.throws(() => validateAIResult(misattributed, request.sourceIds), hasSafeError);
}
assert.throws(() => AIResultSchema.parse({ ...resultFixture, summary: 'x'.repeat(60001) }));
assert.throws(() => AIResultSchema.parse({ ...resultFixture, verifiedEligibility: true }));
console.log('PASS mocked AI grounding: only selected real source IDs, declared citations, provenance separation, uniqueness and bounded strict result');

assert.deepEqual(extractAIOutput(providerResponse(resultFixture)), resultFixture);
assert.throws(() => extractAIOutput({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [] }), hasSafeError);
assert.throws(() => extractAIOutput({ ...providerResponse(resultFixture), status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }), hasSafeError);
assert.throws(() => extractAIOutput({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'PROVIDER_PRIVATE_ERROR_DETAIL' }] }] }), hasSafeError);
assert.throws(() => extractAIOutput({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(resultFixture) }, { type: 'refusal', refusal: 'PROVIDER_PRIVATE_ERROR_DETAIL' }] }] }), hasSafeError);
assert.throws(() => extractAIOutput({ status: 'completed', output: [] }), hasSafeError);
console.log('PASS mocked Responses extraction: completed text only, refusal/incomplete/empty failures exposed safely');

let providerCalls = 0;
let providerRequest;
const liveContract = await requestAI(request, sourceData, 'not-a-real-key-test-fixture', async (url, options) => {
  providerCalls++;
  providerRequest = { url, options };
  return mockResponse(providerResponse(resultFixture));
});
assert.equal(providerCalls, 1);
assert.equal(providerRequest.url, 'https://api.openai.com/v1/responses');
assert.equal(providerRequest.options.method, 'POST');
assert.equal(providerRequest.options.headers.Authorization ?? providerRequest.options.headers.authorization, 'Bearer not-a-real-key-test-fixture');
assert.equal(JSON.parse(providerRequest.options.body).store, false);
assert.deepEqual(liveContract.result, resultFixture);
assert.equal(liveContract.live, true); // Transport contract only: this response is explicitly mocked.
assert.equal(liveContract.model, AI_MODEL);
assert.deepEqual(liveContract.sourceIds, request.sourceIds);
assert.ok(!Number.isNaN(Date.parse(liveContract.generatedAt)));
assert.equal(liveContract.usage.inputTokens, 100);
assert.equal(liveContract.usage.outputTokens, 100);
console.log('PASS mocked provider request: one bounded server call, exact endpoint, structured validation and response metadata');

await assert.rejects(requestAI(request, sourceData, '', async () => { throw new Error('No call expected'); }), error => hasSafeError(error) && error.code === 'credentials_unavailable');
for (const [status, code] of [[401, 'provider_auth'], [403, 'provider_auth'], [429, 'provider_limit'], [500, 'provider_unavailable']]) {
  let calls = 0;
  await assert.rejects(requestAI(request, sourceData, 'not-a-real-key-test-fixture', async () => {
    calls++;
    return mockResponse({ error: { message: 'PROVIDER_PRIVATE_ERROR_DETAIL', secret: 'not-a-real-key-test-fixture' } }, status);
  }), error => hasSafeError(error) && error.code === code);
  assert.equal(calls, 1, 'Provider failures must not start an unbounded retry loop.');
}
await assert.rejects(requestAI(request, sourceData, 'not-a-real-key-test-fixture', async () => { throw new Error('PROVIDER_PRIVATE_ERROR_DETAIL'); }), error => hasSafeError(error) && error.code === 'network');
await assert.rejects(requestAI(request, sourceData, 'not-a-real-key-test-fixture', async () => mockResponse({ ...providerResponse(resultFixture), output: [{ type: 'message', content: [{ type: 'output_text', text: '{invalid JSON' }] }] })), error => hasSafeError(error) && error.code === 'invalid_output');
await assert.rejects(requestAI(request, sourceData, 'not-a-real-key-test-fixture', async () => mockResponse(providerResponse(invalidCitation))), error => hasSafeError(error) && error.code === 'invalid_output');
await assert.rejects(requestAI(request, sourceData, 'not-a-real-key-test-fixture', async (_url, { signal }) => new Promise((_resolve, reject) => {
  if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
  else signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
}), 1), error => hasSafeError(error) && error.code === 'timeout');
await assert.rejects(requestAI(request, sourceData, 'not-a-real-key-test-fixture', async (_url, { signal }) => ({
  ok: true,
  status: 200,
  json: () => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
    else signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }),
}), 1), error => hasSafeError(error) && error.code === 'timeout');
console.log('PASS mocked provider failures: no credential/body leakage, no automatic retries, bounded timeout and invalid-output rejection');

assert.deepEqual(await readAIRequest(new Request('https://example.org/api/ai', { method: 'POST', body: JSON.stringify(request) })), request);
for (const headers of [{}, { 'content-length': '5' }, { 'content-length': String(AI_MAX_REQUEST_BYTES + 2) }]) {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('é'.repeat(Math.ceil(AI_MAX_REQUEST_BYTES / 2) + 1))); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readAIRequest(new Request('https://example.org/api/ai', { method: 'POST', headers, body: stream, duplex: 'half' })), error => hasSafeError(error) && error.status === 413);
  assert.equal(cancelled, true, 'Oversized streams must be cancelled for missing, false and honest Content-Length.');
}
await assert.rejects(readAIRequest(new Request('https://example.org/api/ai', { method: 'POST', body: '{PRIVATE_INPUT_MUST_NOT_APPEAR_IN_ERROR' })), error => hasSafeError(error) && error.status === 400 && !error.message.includes('PRIVATE_INPUT'));
await assert.rejects(readAIRequest(new Request('https://example.org/api/ai', { method: 'POST', body: JSON.stringify({ ...request, privateNotes: 'PRIVATE_INPUT_MUST_NOT_APPEAR_IN_ERROR' }) })), error => hasSafeError(error) && error.status === 400 && !error.message.includes('PRIVATE_INPUT'));
console.log('PASS actual stream parser: bounded bytes with missing/false/honest Content-Length, cancellation and safe invalid-input errors');

const migration = await readFile('drizzle/0001_ai_attempts.sql', 'utf8');
const db = new DatabaseSync(':memory:');
db.exec(migration);
const epoch = Date.parse('2026-10-02T00:00:00Z');
let attemptNumber = 0;
function reserve(connection, user, at) {
  const day = new Date(at).toISOString().slice(0, 10);
  return Number(connection.prepare(AI_RESERVE_SQL).run(`fixture-attempt-${++attemptNumber}`, user, at, day, user, day, user, at - 20000).changes);
}
assert.equal(reserve(db, 'fixture-person', epoch), 1);
assert.equal(reserve(db, 'fixture-person', epoch + 19999), 0);
assert.equal(reserve(db, 'fixture-person', epoch + 20000), 1);
for (let i = 2; i < 10; i++) assert.equal(reserve(db, 'fixture-person', epoch + i * 20000), 1);
assert.equal(reserve(db, 'fixture-person', epoch + 10 * 20000), 0);
assert.equal(reserve(db, 'fixture-other-person', epoch + 10 * 20000), 1);
assert.equal(reserve(db, 'fixture-person', epoch + 86400000), 1);
assert.deepEqual(db.prepare('PRAGMA table_info(ai_attempts)').all().map(column => column.name), ['id', 'user', 'at', 'day']);
assert.equal(reserve(db, 'fixture-provider-failure', epoch), 1);
await assert.rejects(requestAI(request, sourceData, 'not-a-real-key-test-fixture', async () => mockResponse({}, 500)), hasSafeError);
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM ai_attempts WHERE user='fixture-provider-failure'").get().count, 1);
assert.equal(reserve(db, 'fixture-provider-failure', epoch + 1000), 0);
db.close();
console.log('PASS actual SQLite reservation: ten daily attempts, independent users, next UTC day, exact 20-second boundary and consumed failed attempt');

async function simultaneousReservations(path, attempts) {
  const workers = [];
  const ready = [];
  const completed = [];
  for (const attempt of attempts) {
    const worker = new Worker(`
      const { parentPort, workerData } = require('node:worker_threads');
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(workerData.path);
      db.exec('PRAGMA busy_timeout=10000');
      parentPort.once('message', () => {
        const a = workerData.attempt;
        const changes = Number(db.prepare(workerData.sql).run(a.id,a.user,a.at,a.day,a.user,a.day,a.user,a.at-20000).changes);
        db.close();
        parentPort.postMessage({ changes });
      });
      parentPort.postMessage({ ready: true });
    `, { eval: true, workerData: { path, sql: AI_RESERVE_SQL, attempt } });
    workers.push(worker);
    ready.push(new Promise((resolve, reject) => { worker.on('message', message => { if (message.ready) resolve(); }); worker.once('error', reject); }));
    completed.push(new Promise((resolve, reject) => { worker.on('message', message => { if ('changes' in message) resolve(message.changes); }); worker.once('error', reject); }));
  }
  try {
    await Promise.all(ready);
    for (const worker of workers) worker.postMessage('reserve');
    return await Promise.all(completed);
  } finally { await Promise.all(workers.map(worker => worker.terminate())); }
}

const fixtureDirectory = await mkdtemp(join(tmpdir(), 'suhba-ai-reservations-'));
try {
  const path = join(fixtureDirectory, 'attempts.sqlite');
  const concurrentDb = new DatabaseSync(path);
  concurrentDb.exec('PRAGMA journal_mode=WAL');
  concurrentDb.exec(migration);
  const concurrent = (prefix, count, user) => Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, user: user ?? `${prefix}-person-${i}`, at: epoch, day: '2026-10-02' }));
  const sameUser = await simultaneousReservations(path, concurrent('same-user', 8, 'fixture-same-person'));
  assert.equal(sameUser.reduce((sum, changes) => sum + changes, 0), 1, 'Simultaneous requests by one user must share the cooldown.');
  concurrentDb.exec('DELETE FROM ai_attempts');
  for (let i = 0; i < 96; i++) assert.equal(reserve(concurrentDb, `global-prefill-${i}`, epoch), 1);
  const global = await simultaneousReservations(path, concurrent('global-contenders', 8));
  assert.equal(global.reduce((sum, changes) => sum + changes, 0), 4, 'Simultaneous requests must not exceed 100 lifetime reservations.');
  assert.equal(concurrentDb.prepare('SELECT COUNT(*) AS count FROM ai_attempts').get().count, 100);
  assert.equal(reserve(concurrentDb, 'fixture-next-day-person', epoch + 86400000), 0, 'The total preview cap does not reset the next day.');
  concurrentDb.close();
} finally { await rm(fixtureDirectory, { recursive: true, force: true }); }
console.log('PASS actual SQLite contention: eight same-user requests reserve once; eight global contenders reserve only four remaining slots; lifetime cap remains 100');
