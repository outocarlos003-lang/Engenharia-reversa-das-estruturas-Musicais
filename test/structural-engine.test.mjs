import test from 'node:test';
import assert from 'node:assert/strict';
import { findStructuralMotifs, inferMusicalStructure } from '../src/analysis/structural-engine.mjs';

const repeatedTransposed = [
  {id:'a1',start:0,duration:1,pitch:60},
  {id:'a2',start:1,duration:0.5,pitch:62},
  {id:'a3',start:1.5,duration:0.5,pitch:64},
  {id:'b1',start:3,duration:1,pitch:65},
  {id:'b2',start:4,duration:0.5,pitch:67},
  {id:'b3',start:4.5,duration:0.5,pitch:69},
];

test('detects a repeated motif under transposition',()=>{
  const motifs=findStructuralMotifs(repeatedTransposed,{minLength:3,maxLength:3});
  assert.ok(motifs.some(m=>m.recurrence>=2),JSON.stringify(motifs));
  const motif=motifs.find(m=>m.recurrence>=2);
  assert.deepEqual(motif.invariant.melodic_contour,['+','+']);
  assert.equal(motif.occurrences.length,2);
});

test('returns a hierarchical structural hypothesis and separates uncertainty',()=>{
  const result=inferMusicalStructure(repeatedTransposed,{maxPhraseEvents:3,motifs:{minLength:3,maxLength:3}});
  assert.equal(result.events.length,6);
  assert.equal(result.phrases.length,2);
  assert.ok(result.invariants.relative_intervals.includes(2));
  assert.ok(result.epistemic_status.observed.includes('event order'));
  assert.ok(result.epistemic_status.unresolved.includes('cadential phrase boundaries'));
  assert.match(result.form.pattern,/A/);
});

test('does not invent motifs when there are not enough events',()=>{
  assert.deepEqual(findStructuralMotifs([{start:0,pitch:60},{start:1,pitch:64}],{minLength:3}),[]);
});

test('preserves missing pitch as unknown instead of treating it as MIDI zero',()=>{
  const result=inferMusicalStructure([{start:0,pitch:null},{start:1,pitch:64}]);
  assert.deepEqual(result.invariants.relative_intervals,[null]);
});
