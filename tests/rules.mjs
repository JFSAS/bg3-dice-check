import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const defaults=src.match(/const defaults = (.*);/)[0];
const functions=['validate','evaluate','probability','d20'].map(name=>{const start=src.indexOf(`function ${name}(`);let bracket=src.indexOf('{',start),depth=1,i=bracket+1;for(;depth;i++){if(src[i]==='{')depth++;if(src[i]==='}')depth--;}return src.slice(start,i);}).join('\n');
let values=[];let calls=0;const sandbox={crypto:{getRandomValues:arr=>{calls++;arr[0]=values.shift();return arr;}},Uint32Array};vm.createContext(sandbox);vm.runInContext(defaults+'\n'+functions+'\nthis.rules={defaults,validate,evaluate,probability,d20};',sandbox);
const r=sandbox.rules,c={...r.defaults};
assert.equal(r.evaluate(9,c).success,true);assert.equal(r.evaluate(8,c).success,false);assert.equal(r.evaluate(1,{...c,ability:20,dc:1}).success,false);assert.equal(r.evaluate(20,{...c,ability:-20,dc:40}).success,true);assert.equal(r.evaluate(20,{...c,critical:false,ability:-20,dc:40}).success,false);assert.equal(r.probability(c),60);assert.throws(()=>r.validate({...c,dc:1.5}));assert.throws(()=>r.validate({...c,question:''}));assert.throws(()=>r.validate({...c,critical:'false'}));
for(let i=0;i<20;i++){values=[i];assert.equal(r.d20(),i+1);}
values=[4294967295,19];calls=0;assert.equal(r.d20(),20);assert.equal(calls,2);
console.log('PASS: DC boundaries, natural 1/20, optional critical rule, exact probability, invalid input, 20 random outcomes, rejection of biased tail.');
