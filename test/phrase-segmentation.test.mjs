import test from 'node:test';
import assert from 'node:assert/strict';
import { inferMusicalStructure } from '../src/analysis/structural-engine.mjs';

test('infers phrase boundary from a substantial rest instead of only fixed event counts',()=>{
  const events=[
    {id:'a',start:0,duration:0.5,pitch:60},
    {id:'b',start:0.5,duration:0.5,pitch:62},
    {id:'c',start:1,duration:0.5,pitch:64},
    {id:'d',start:5,duration:0.5,pitch:65},
    {id:'e',start:5.5,duration:0.5,pitch:67},
    {id:'f',start:6,duration:0.5,pitch:69},
  ];
  const result=inferMusicalStructure(events,{phraseBoundaryMinGap:1,phraseBoundaryGapRatio:2,maxPhraseEvents:16});
  assert.equal(result.phrases.length,2);
  assert.equal(result.phrases[1].boundary_reason,'inter_phrase_gap');
  assert.equal(result.phrases[1].boundary_status,'inferred');
  assert.equal(result.phrases[1].evidence.measured_gap_before,3.5);
});

test('honors source-declared phrase boundaries',()=>{
  const events=[
    {id:'a',start:0,duration:1,pitch:60,phrase_id:'A'},
    {id:'b',start:1,duration:1,pitch:62,phrase_id:'A'},
    {id:'c',start:2,duration:1,pitch:64,phrase_id:'B'},
    {id:'d',start:3,duration:1,pitch:65,phrase_id:'B'},
  ];
  const result=inferMusicalStructure(events,{maxPhraseEvents:16});
  assert.equal(result.phrases.length,2);
  assert.equal(result.phrases[1].boundary_reason,'source_phrase_id_change');
  assert.equal(result.phrases[1].confidence,0.9);
});

test('uses maximum phrase size only as a safety cap when no stronger boundary exists',()=>{
  const events=Array.from({length:5},(_,i)=>({id:`e${i}`,start:i,duration:1,pitch:60+i}));
  const result=inferMusicalStructure(events,{maxPhraseEvents:2,phraseBoundaryGapRatio:10,phraseBoundaryMinGap:10});
  assert.deepEqual(result.phrases.map(p=>p.event_ids.length),[2,2,1]);
  assert.equal(result.phrases[0].boundary_reason,'safety_cap');
});
