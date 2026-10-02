import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const js = ts.transpileModule(await readFile('components/ai-assistant.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function load(hooks) {
  const module = { exports: {} };
  const imports = name => name.endsWith('.css') ? {} : name === 'react' && hooks ? hooks : require(name);
  new Function('require', 'module', 'exports', js)(imports, module, module.exports);
  return module.exports.default;
}
const sources = [{ id: 'source', title: 'Official fixture', creator: 'Official publisher', status: 'available', url: 'https://example.org/guide' }];
const AiAssistant = load();
const props = { mode: 'goal', sources, initialInput: 'Selected context', available: true };
const disabledHtml = renderToStaticMarkup(createElement(AiAssistant, { ...props, disabled: true }));
assert.match(disabledHtml, /<textarea[^>]*disabled=""/);
assert.match(disabledHtml, /<fieldset[^>]*disabled=""/);
assert.match(disabledHtml, /<input[^>]*type="checkbox"[^>]*disabled=""/);
assert.match(disabledHtml, /<button[^>]*class="suhba-ai-generate"[^>]*disabled=""/);
assert.ok(disabledHtml.includes('Workspace save in progress'));
const enabledHtml = renderToStaticMarkup(createElement(AiAssistant, props));
assert.ok(!enabledHtml.match(/<textarea[^>]*disabled=""/));
assert.ok(!enabledHtml.match(/<button[^>]*class="suhba-ai-generate"[^>]*disabled=""/));

// Controlled hook harness invokes real component handlers captured before a save.
// Re-rendering retains refs, exercising the stale-handler guard rather than only markup.
let stateIndex = 0, refIndex = 0, writes = 0, applications = 0, fetches = 0;
const signature = JSON.stringify({ mode: 'goal', input: 'Selected context', sourceIds: [], evidence: [] });
const states = ['Selected context', [], { result: { summary: 'Controlled test proposal' }, sourceIds: [], signature }, false, '', ''];
const refs = [];
const hooks = {
  useId: () => 'controlled-test', useEffect: () => {}, useMemo: fn => fn(),
  useState: initial => { const index = stateIndex++; return [states[index] ?? initial, () => { writes++; }]; },
  useRef: initial => { const index = refIndex++; return refs[index] ?? (refs[index] = { current: initial }); },
};
const Controlled = load(hooks);
function render(disabled) { stateIndex = 0; refIndex = 0; return Controlled({ ...props, disabled, onApply: () => { applications++; } }); }
function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
const before = elements(render(false));
const oldGenerate = before.find(element => element.props?.className === 'suhba-ai-generate').props.onClick;
const oldApply = before.find(element => element.props?.className === 'suhba-ai-apply').props.onClick;
const oldContext = before.find(element => element.type === 'textarea').props.onChange;
const oldSource = before.find(element => element.props?.type === 'checkbox').props.onChange;
const during = elements(render(true));
assert.equal(during.find(element => element.props?.className === 'suhba-ai-apply').props.disabled, true);
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { fetches++; throw new Error('Blocked request escaped its guard'); };
try {
  await oldGenerate(); oldApply(); oldContext({ target: { value: 'Changed during save' } }); oldSource();
  assert.equal(fetches, 0); assert.equal(applications, 0); assert.equal(writes, 0);
} finally { globalThis.fetch = originalFetch; }
const running = new AbortController(); refs[0].current = running; states[3] = true;
const cancel = elements(render(true)).find(element => element.type === 'button' && element.props.children === 'Cancel generation');
assert.ok(cancel); assert.notEqual(cancel.props.disabled, true); cancel.props.onClick(); assert.equal(running.signal.aborted, true);
console.log('PASS AI save locking: SSR disables context, sources and Generate; Apply disabled; stale Generate/Apply/edit handlers have no side effects; active request cancellation remains usable.');
