import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicalRepresentation } from '../src/music/representation.mjs';
import { analyzeRhythm } from '../src/analysis/rhythm.mjs';
import { findMotifs } from '../src/analysis/motifs.mjs';

test('musical representation initializes musical timing', () => {
  const representation = createMusicalRepresentation({
    timing: { bpm: 120, meter: '4/4' },
  });

  assert.equal(representation.timing.bpm, 120);
});

test('rhythmic analysis derives structure from musical events', () => {
  const representation = createMusicalRepresentation({
    timing: { meter: '4/4', grid: '1/16' },
    events: [
      { id: 'e1', duration: 1, accent: 1 },
      { id: 'e2', duration: 0.5, accent: 0 },
    ],
  });

  const result = analyzeRhythm(representation);
  assert.equal(result.event_count, 2);
  assert.deepEqual(result.duration_profile, [1, 0.5]);
});

test('motif analysis detects recurring event signatures', () => {
  const representation = createMusicalRepresentation({
    events: [
      { id: 'e1', signature: 'A-B-C' },
      { id: 'e2', signature: 'A-B-C' },
      { id: 'e3', signature: 'X' },
    ],
  });

  const motifs = findMotifs(representation);
  assert.equal(motifs.length, 1);
  assert.equal(motifs[0].recurrence, 2);
});
