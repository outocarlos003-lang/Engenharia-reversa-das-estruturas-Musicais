import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMotifTransformations } from '../src/analysis/transformations.mjs';

test('detects transposition with the same interval structure',()=>{
  const events=[
    {id:'a1',start:0,pitch:60},{id:'a2',start:1,pitch:62},{id:'a3',start:2,pitch:65},
    {id:'b1',start:4,pitch:67},{id:'b2',start:5,pitch:69},{id:'b3',start:6,pitch:72},
  ];
  const found=analyzeMotifTransformations(events,{minLength:3,maxLength:3});
  assert.ok(found.some(x=>x.melodic_relation.type==='transposition'&&x.melodic_relation.semitones===7),JSON.stringify(found));
});

test('detects melodic inversion as a distinct transformation',()=>{
  const events=[
    {id:'a1',start:0,pitch:60},{id:'a2',start:1,pitch:62},{id:'a3',start:2,pitch:65},
    {id:'b1',start:4,pitch:70},{id:'b2',start:5,pitch:68},{id:'b3',start:6,pitch:65},
  ];
  const found=analyzeMotifTransformations(events,{minLength:3,maxLength:3});
  assert.ok(found.some(x=>x.melodic_relation.type==='inversion'),JSON.stringify(found));
});

test('detects rhythmic augmentation while preserving melodic intervals',()=>{
  const events=[
    {id:'a1',start:0,pitch:60},{id:'a2',start:1,pitch:62},{id:'a3',start:2,pitch:65},
    {id:'b1',start:4,pitch:67},{id:'b2',start:6,pitch:69},{id:'b3',start:8,pitch:72},
  ];
  const found=analyzeMotifTransformations(events,{minLength:3,maxLength:3});
  assert.ok(found.some(x=>x.melodic_relation.type==='transposition'&&x.rhythmic_relation.type==='rhythmic_augmentation'&&x.rhythmic_relation.ratio===2),JSON.stringify(found));
});

test('does not infer transformations without enough pitched events',()=>{
  assert.deepEqual(analyzeMotifTransformations([{start:0,pitch:60},{start:1,pitch:null}],{minLength:3}),[]);
});
