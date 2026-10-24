import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMusicalDimensions } from '../src/analysis/musical-dimensions.mjs';

test('builds all fourteen dimensions without inventing absent measurements', () => {
  const result = buildMusicalDimensions({}, { tempo: { bpm: 120 } });
  assert.equal(Object.keys(result).length, 16);
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

test('records mechanical voice analysis only when voice-specific evidence is supplied', () => {
  const voiceAnalysis = {
    phonation: 'breathy',
    vibrato: { present: true, rate_hz: 5.2 },
    articulation: 'legato',
    time_range: { start: 12, end: 18, unit: 'seconds' },
    method: 'human annotation',
  };
  const result = buildMusicalDimensions({ voice_analysis: voiceAnalysis });
  assert.equal(result.mechanical_voice_analysis.id, 'mechanical_voice_analysis');
  assert.deepEqual(result.mechanical_voice_analysis.value, voiceAnalysis);
  assert.equal(result.mechanical_voice_analysis.status, 'observed');
  assert.match(result.mechanical_voice_analysis.limitations[0], /não significa que o motor tenha extraído automaticamente/);
});

test('does not infer mechanical voice properties from absent metadata or generic audio descriptors', () => {
  const result = buildMusicalDimensions({ audio_analysis: { spectrum: { centroid_hz: 1200 } } });
  assert.equal(result.mechanical_voice_analysis.value, null);
  assert.equal(result.mechanical_voice_analysis.status, 'unknown');
});

test('uses acoustic F0 only as a non-vocal-specific voice-analysis candidate', () => {
  const result = buildMusicalDimensions({
    audio_analysis: {
      fundamental_frequency_track: [{ time_seconds: 0.02, f0_hz: 220, periodicity: 0.99, status: 'candidate_periodic_f0' }],
    },
  });
  assert.equal(result.mechanical_voice_analysis.status, 'inferred');
  assert.equal(result.mechanical_voice_analysis.value.vocal_source_confirmed, false);
  assert.equal(result.mechanical_voice_analysis.value.acoustic_f0_track[0].f0_hz, 220);
  assert.match(result.mechanical_voice_analysis.limitations[0], /não confirma que a fonte seja voz humana/);
});

test('accepts explicit vocal-region annotations without pretending to detect voice automatically', () => {
  const result = buildMusicalDimensions({
    vocal_regions: [
      { start_seconds: 1.25, end_seconds: 3.5, confidence: 0.9, source: 'human annotation' },
      { start_seconds: -1, end_seconds: 2 },
      { start_seconds: 4, end_seconds: 4 },
      { start_seconds: 5, end_seconds: 6, confidence: 2 },
    ],
  });
  assert.equal(result.mechanical_voice_analysis.status, 'observed');
  assert.equal(result.mechanical_voice_analysis.value.vocal_source_confirmed, true);
  assert.deepEqual(result.mechanical_voice_analysis.value.vocal_regions, [
    { start_seconds: 1.25, end_seconds: 3.5, annotation: 'vocal_region', confidence: 0.9, source: 'human annotation' },
    { start_seconds: 5, end_seconds: 6, annotation: 'vocal_region', confidence: 1, source: 'source annotation' },
  ]);
  assert.match(result.mechanical_voice_analysis.limitations[0], /não detectou nem validou automaticamente/);
});

test('keeps vocal source unconfirmed when only an acoustic F0 track is present', () => {
  const result = buildMusicalDimensions({
    audio_analysis: { fundamental_frequency_track: [{ time_seconds: 0.02, f0_hz: 220, periodicity: 0.99, status: 'candidate_periodic_f0' }] },
  });
  assert.equal(result.mechanical_voice_analysis.value.vocal_source_confirmed, false);
  assert.deepEqual(result.mechanical_voice_analysis.value.vocal_regions, []);
});
