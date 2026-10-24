import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMusicalDimensions } from '../src/analysis/musical-dimensions.mjs';

test('builds all thirteen dimensions without inventing absent measurements', () => {
  const result = buildMusicalDimensions({}, { tempo: { bpm: 120 } });
  assert.equal(Object.keys(result).length, 15);
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

test('adds instrumental and sound sources as the thirteenth dimension without guessing vocal status', () => {
  const result = buildMusicalDimensions({
    instrumentation: { sources: ['piano', 'drums'] },
  });
  assert.equal(result.instrumental_sound_sources.id, 'instrumental_sound_sources');
  assert.deepEqual(result.instrumental_sound_sources.value, {
    instrumentation: { sources: ['piano', 'drums'] },
    vocal_presence: null,
  });
  assert.equal(result.instrumental_sound_sources.status, 'observed');
  assert.match(result.instrumental_sound_sources.limitations[0], /não significa que a faixa seja instrumental/);
});

test('keeps the thirteenth dimension unknown when no source metadata exists', () => {
  const result = buildMusicalDimensions({});
  assert.equal(result.instrumental_sound_sources.value, null);
  assert.equal(result.instrumental_sound_sources.status, 'unknown');
});
