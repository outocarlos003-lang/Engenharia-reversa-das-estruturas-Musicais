import test from 'node:test';
import assert from 'node:assert/strict';
import { contextualizeTransformations } from '../src/analysis/structural-relations.mjs';

const baseTransformation={
  id:'transform-1',
  source:{event_ids:['e1','e2','e3']},
  target:{event_ids:['e7','e8','e9']},
  melodic_relation:{type:'transposition',semitones:5},
  rhythmic_relation:{type:'same_rhythm',ratio:1},
};

test('classifies a transformation between phrases in the same section',()=>{
  const structure={
    phrases:[
      {id:'phrase-1',event_ids:['e1','e2','e3'],boundary_status:'provisional'},
      {id:'phrase-2',event_ids:['e7','e8','e9'],boundary_status:'provisional'},
    ],
    sections:[{id:'section-A',phrase_ids:['phrase-1'],occurrences:[{phrase_id:'phrase-1'},{phrase_id:'phrase-2'}]}],
  };
  const [result]=contextualizeTransformations([baseTransformation],structure);
  assert.equal(result.structural_context.source_phrase.id,'phrase-1');
  assert.equal(result.structural_context.target_phrase.id,'phrase-2');
  assert.equal(result.structural_context.relation_scope,'between_phrases_within_section');
});

test('distinguishes transformations across section hypotheses',()=>{
  const structure={
    phrases:[
      {id:'phrase-1',event_ids:['e1','e2','e3']},
      {id:'phrase-2',event_ids:['e7','e8','e9']},
    ],
    sections:[
      {id:'section-A',phrase_ids:['phrase-1'],occurrences:[{phrase_id:'phrase-1'}]},
      {id:'section-B',phrase_ids:['phrase-2'],occurrences:[{phrase_id:'phrase-2'}]},
    ],
  };
  const [result]=contextualizeTransformations([baseTransformation],structure);
  assert.equal(result.structural_context.relation_scope,'across_sections');
});

test('keeps structural context unresolved when event windows do not map to phrases',()=>{
  const [result]=contextualizeTransformations([baseTransformation],{phrases:[],sections:[]});
  assert.equal(result.structural_context.relation_scope,'unresolved');
  assert.equal(result.structural_context.source_phrase,null);
});
