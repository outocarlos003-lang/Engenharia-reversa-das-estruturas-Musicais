import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicalRepresentation } from '../src/music/representation.mjs';
import { detectPhrases } from '../src/analysis/phrases.mjs';
import { segmentSections, findRepeatedSections } from '../src/analysis/sections.mjs';

test('phrase detection preserves musical event order', () => {
  const representation = createMusicalRepresentation({
    events: [
      { id: 'e2', onset: 1, duration: 1, pitch: 64 },
      { id: 'e1', onset: 0, duration: 1, pitch: 60 },
      { id: 'e3', onset: 2, duration: 1, pitch: 67 },
    ],
  });

  const phrases = detectPhrases(representation, { maxEvents: 2 });
  assert.equal(phrases.length, 2);
  assert.deepEqual(phrases[0].event_ids, ['e1', 'e2']);
});

test('section segmentation builds sections from phrases', () => {
  const phrases = [
    { id: 'p1', start: 0, end: 2, signature: ['A', 'B'] },
    { id: 'p2', start: 2, end: 4, signature: ['C', 'D'] },
  ];

  const sections = segmentSections(createMusicalRepresentation(), phrases);
  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0].phrase_ids, ['p1']);
});

test('repeated section evidence is explicit', () => {
  const sections = [
    { id: 's1', phrase_ids: ['p1', 'p2'] },
    { id: 's2', phrase_ids: ['p1', 'p2'] },
  ];

  const repeated = findRepeatedSections(sections);
  assert.equal(repeated.length, 1);
  assert.equal(repeated[0].similarity, 1);
});
