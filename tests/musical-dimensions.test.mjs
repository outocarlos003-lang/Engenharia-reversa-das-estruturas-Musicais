import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMusicalDimensions } from '../src/analysis/musical-dimensions.mjs';

test('builds all twelve dimensions without inventing absent measurements', () => {
  const result = buildMusicalDimensions({}, { tempo: { bpm: 120 } });
  assert.equal(Object.keys(result).length, 14);
  assert.equal(result.tempo.value, 120);
  assert.equal(result.tempo.status, 'inferred');
  assert.equal(result.loudness.value, null);
  assert.equal(result.loudness.status, 'unknown');
  assert.deepEqual(result.primary_genres.value, []);
  assert.equal(result.primary_genres.status, 'not_assessed');
});

test('preserves explicit annotations and provenance', () => {
  const result = buildMusicalDimensions({
    musical_dimensions: {
      emotional_tone: {
        value: 'melancholic',
        status: 'interpreted',
        confidence: 0.72,
        evidence: ['annotator note'],
        limitations: ['Subjective interpretation'],
      },
    },
  });
  assert.equal(result.emotional_tone.value, 'melancholic');
  assert.equal(result.emotional_tone.status, 'interpreted');
  assert.equal(result.emotional_tone.confidence, 0.72);
  assert.deepEqual(result.emotional_tone.evidence, ['annotator note']);
});

test('uses supplied dynamics as energy evidence but does not label it audio measurement', () => {
  const result = buildMusicalDimensions({ dynamics: { profile: [0.2, 0.8] } });
  assert.deepEqual(result.energy_structure.value, { dynamics_profile: [0.2, 0.8] });
  assert.match(result.energy_structure.limitations[0], /no audio RMS/);
});
