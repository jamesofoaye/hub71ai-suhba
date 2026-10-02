import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
const js=ts.transpileModule(await readFile('lib/model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};new Function('require','module','exports',js)(createRequire(import.meta.url),module,module.exports);
const {validate,summarizeScenario}=module.exports;
const base=validate('scenario',{title:'Explicit budget fixture',startingCash:500,income:1000,availableHours:6,items:[{id:'fixed',label:'Fixed expenses',cash:900,hours:2,basis:'user fact'},{id:'fee',label:'Fee',cash:300,hours:3,basis:'assumption'},{id:'transport',label:'Transport',cash:50,hours:1,basis:'user fact'}]});
assert.equal(summarizeScenario(base).cashRemaining,250);assert.equal(summarizeScenario(base).hoursRemaining,0);
const copy=structuredClone(base);copy.items.push({id:'extra',label:'Extra',cash:100,hours:2,basis:'assumption',sourceId:'',dependsOn:[]});
assert.equal(summarizeScenario(copy).cashRemaining,150);assert.equal(summarizeScenario(copy).hoursRemaining,-2);assert.equal(summarizeScenario(base).cashRemaining,250);
const unknown=structuredClone(base);unknown.items[0].cash=null;assert.equal(summarizeScenario(unknown).cashRemaining,null);assert.equal(summarizeScenario(unknown).cash,null);
assert.throws(()=>validate('scenario',{...base,items:[{id:'bad',label:'NaN',cash:NaN,hours:1,basis:'assumption'}]}));
assert.throws(()=>validate('scenario',{...base,startingCash:-1}));
console.log('PASS cash 250 AED; what-if 150 AED; baseline unchanged; time 0 / -2 h; unknown preserved; NaN and negative rejected');

assert.throws(()=>validate('scenario',{title:'loop',items:[{id:'x',label:'X',cash:null,hours:null,basis:'assumption',dependsOn:['x']}]}));
assert.throws(()=>validate('scenario',{title:'dup',items:[{id:'x',label:'X',cash:null,hours:null,basis:'assumption'},{id:'x',label:'Y',cash:null,hours:null,basis:'assumption'}]}));
const constrained=validate('scenario',{...base,rules:[{id:'r',label:'Family time',type:'max hours',limit:5,itemId:''},{id:'e',label:'Confirmed cost',type:'require evidence',limit:null,itemId:'fee'}]});
assert.equal(summarizeScenario(constrained).conflicts.length,2);
console.log('PASS scenario dependencies, duplicate IDs, household time and evidence constraints');

const pennies=validate('scenario',{title:'Decimal precision',startingCash:0.3,income:0,budget:0.3,availableHours:0.3,items:[{id:'a',label:'A',cash:0.1,hours:0.1,basis:'assumption'},{id:'b',label:'B',cash:0.2,hours:0.2,basis:'assumption'}],rules:[{id:'limit',label:'Cash limit',type:'max cash',limit:0.3,itemId:''}]});
const precise=summarizeScenario(pennies);assert.equal(precise.cash,0.3);assert.equal(precise.cashRemaining,0);assert.equal(precise.hours,0.3);assert.equal(precise.hoursRemaining,0);assert.deepEqual(precise.conflicts,[]);
assert.throws(()=>validate('scenario',{...pennies,budget:0.001}));assert.throws(()=>validate('scenario',{...pennies,income:Number.MAX_VALUE}));assert.throws(()=>validate('scenario',{...pennies,rules:[{id:'bad',label:'Bad cash precision',type:'max cash',limit:0.001}]}));
console.log('PASS decimal cash/time arithmetic without false constraint conflicts; unsupported currency precision and unsafe magnitudes rejected');
