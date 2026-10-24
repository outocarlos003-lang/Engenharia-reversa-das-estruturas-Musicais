import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMelody } from '../src/analysis/melody.mjs';
import { analyzeHarmony } from '../src/analysis/harmony.mjs';
import { detectMusicalEvents } from '../src/analysis/events.mjs';

test('melody derives contour and range from musical notes', () => {
  const result = analyzeMelody({ melody: { notes: [{ pitch: 60 }, { pitch: 64 }, { pitch: 64 }, { pitch: 62 }] } });
  assert.deepEqual(result.contour, ['up', 'same', 'down']);
  assert.equal(result.range.semitones, 4);
});

test('harmony preserves chord transitions and harmonic center', () => {
  const result = analyzeHarmony({ harmony: { center: 'D minor', chords: [{ symbol: 'Dm' }, { symbol: 'Bb' }, { symbol: 'A' }] } });
  assert.equal(result.center, 'D minor');
  assert.deepEqual(result.transitions, [{ from: 'Dm', to: 'Bb' }, { from: 'Bb', to: 'A' }]);
});

test('musical events are ordered by onset', () => {
  const result = detectMusicalEvents({ events: [{ start: 2 }, { start: 0 }, { start: 1 }] });
  assert.deepEqual(result.onsets, [0, 1, 2]);
  assert.deepEqual(result.interOnsetIntervals, [1, 1]);
});
