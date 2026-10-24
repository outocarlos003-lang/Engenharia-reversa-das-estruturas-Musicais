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
  assert.equal(result.phrases[1].boundary_status,'supported');
  assert.equal(result.phrases[1].evidence.classification,'supported');
  assert.ok(result.phrases[1].evidence.score>=0.75);
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
  assert.equal(result.phrases[1].confidence,0.95);
});

test('uses maximum phrase size only as a safety cap when no stronger boundary exists',()=>{
  const events=Array.from({length:5},(_,i)=>({id:`e${i}`,start:i,duration:1,pitch:60+i}));
  const result=inferMusicalStructure(events,{maxPhraseEvents:2,phraseBoundaryGapRatio:10,phraseBoundaryMinGap:10});
  assert.deepEqual(result.phrases.map(p=>p.event_ids.length),[2,2,1]);
  assert.equal(result.phrases[0].boundary_reason,'safety_cap');
});

test('combines a moderate rest with supplied metrical accent and records each evidence source',()=>{
  const events=[
    {id:'a',start:0,duration:0.5,pitch:60},
    {id:'b',start:0.5,duration:0.5,pitch:62},
    {id:'c',start:2,duration:0.5,pitch:64,metrical_strength:0.8},
    {id:'d',start:2,duration:0.5,pitch:65},
  ];
  const result=inferMusicalStructure(events,{phraseBoundaryMinGap:0.5,phraseBoundaryGapRatio:1.25,maxPhraseEvents:16});
  assert.equal(result.phrases.length,2);
  const boundary=result.phrases[1].evidence;
  assert.ok(boundary.evidence.some(item=>item.type==='inter_event_rest'));
  assert.ok(boundary.evidence.some(item=>item.type==='metrical_accent'));
  assert.equal(boundary.classification,'supported');
});

test('records an end-of-source boundary as unresolved rather than claiming a cadence',()=>{
  const result=inferMusicalStructure([{start:0,duration:1,pitch:60},{start:1,duration:1,pitch:62}]);
  assert.equal(result.phrases[0].boundary_reason,'end_of_source');
  assert.equal(result.phrases[0].boundary_status,'provisional');
  assert.equal(result.phrases[0].evidence.classification,'insufficient');
});

test('uses recurrence at a motif transition as supporting evidence without treating it as proof',()=>{
  const events=[
    {id:'a1',start:0,duration:1,pitch:60},
    {id:'a2',start:1,duration:1,pitch:62},
    {id:'a3',start:2,duration:1,pitch:64},
    {id:'b1',start:6,duration:1,pitch:60},
    {id:'b2',start:7,duration:1,pitch:62},
    {id:'b3',start:8,duration:1,pitch:64},
  ];
  const result=inferMusicalStructure(events,{maxPhraseEvents:16,phraseBoundaryMinGap:0.75,phraseBoundaryGapRatio:2.5,motifs:{minLength:3,maxLength:3}});
  assert.equal(result.phrases.length,2);
  const boundary=result.phrases[1].evidence;
  assert.ok(boundary.evidence.some(item=>item.type==='recurring_motif_boundary'));
  assert.ok(boundary.evidence.some(item=>item.type==='inter_event_rest'));
  assert.ok(boundary.score>=0.75);
  assert.ok(result.motifs.some(motif=>motif.recurrence>=2));
});

test('describes melodic motion at a boundary without calling it a cadence',()=>{
  const events=[
    {id:'a',start:0,duration:0.5,pitch:60},
    {id:'b',start:0.5,duration:0.5,pitch:61},
    {id:'c',start:1,duration:0.5,pitch:62},
    {id:'d',start:5,duration:0.5,pitch:64},
  ];
  const result=inferMusicalStructure(events,{phraseBoundaryMinGap:1,phraseBoundaryGapRatio:2,maxPhraseEvents:16});
  const boundary=result.phrases[1].evidence;
  assert.equal(boundary.melodic_transition,'leap');
  assert.ok(boundary.evidence.some(item=>item.type==='melodic_transition'&&item.weight===0));
  assert.ok(boundary.unresolved.some(item=>item.includes('Cadential and harmonic evidence')));
});

test('describes melodic motion at a boundary',()=>{
  const events=[
    {id:'a',start:0,duration:0.5,pitch:60},
    {id:'b',start:0.5,duration:0.5,pitch:61},
    {id:'c',start:1,duration:0.5,pitch:62},
    {id:'d',start:5,duration:0.5,pitch:64},
  ];
  const result=inferMusicalStructure(events,{phraseBoundaryMinGap:1,phraseBoundaryGapRatio:2,maxPhraseEvents:16});
  assert.equal(result.phrases[1].evidence.melodic_transition,'leap');
  assert.ok(result.phrases[1].evidence.basis.some(item=>item.type==='melodic_transition'));
});

test('honors an explicit terminal marker on the preceding event',()=>{
  const events=[
    {id:'a',start:0,duration:1,pitch:60,phrase_end:true},
    {id:'b',start:1,duration:1,pitch:62},
  ];
  const result=inferMusicalStructure(events);
  assert.equal(result.phrases.length,2);
  assert.equal(result.phrases[1].boundary_reason,'source_declared_boundary');
  assert.ok(result.phrases[1].evidence.basis.some(item=>item.type==='source_marker'));
});

test('uses supplied cadential strength as supporting evidence, not as a fabricated harmonic inference',()=>{
  const events=[
    {id:'a',start:0,duration:1,pitch:60},
    {id:'b',start:1,duration:1,pitch:62},
    {id:'c',start:2,duration:1,pitch:64,cadential_strength:0.9},
    {id:'d',start:5,duration:1,pitch:65},
  ];
  const result=inferMusicalStructure(events,{phraseBoundaryMinGap:0.5,phraseBoundaryGapRatio:1.25,maxPhraseEvents:16});
  const boundary=result.phrases[1].evidence;
  assert.ok(boundary.basis.some(item=>item.type==='source_cadential_strength'&&item.source_supplied===true));
  assert.ok(boundary.score>=0.75);
});
