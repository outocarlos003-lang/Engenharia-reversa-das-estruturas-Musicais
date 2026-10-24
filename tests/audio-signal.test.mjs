import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAudioSamples } from '../src/analysis/audio-signal.mjs';
import { analyzeMusicalSource } from '../src/analysis/analyzer.mjs';

test('measures peak, RMS, duration and spectrum from normalized PCM samples', () => {
  const sampleRate = 8000;
  const samples = Array.from({ length: 4096 }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 440 * i / sampleRate));
  const result = analyzeAudioSamples({ samples, sampleRate, frameSize: 1024 });
  assert.equal(result.duration_seconds, 0.512);
  assert.ok(Math.abs(result.peak_amplitude - 0.5) < 0.001);
  assert.ok(Math.abs(result.rms_amplitude - Math.SQRT1_2 * 0.5) < 0.002);
  assert.ok(Math.abs(result.spectrum.centroid_hz - 440) < 35);
  assert.equal(result.stereo, null);
  assert.match(result.limitations[0], /already be decoded/);
});

test('measures stereo correlation and keeps audio properties distinct from LUFS', () => {
  const left = Array.from({ length: 1024 }, (_, i) => 0.25 * Math.sin(2 * Math.PI * i / 32));
  const samples = left.map(value => [value, -value]);
  const result = analyzeAudioSamples({ samples, sampleRate: 8000 });
  assert.equal(result.stereo.correlation, -1);
  assert.ok(result.stereo.side_to_mid_db > 100);
  assert.match(result.limitations[1], /not standards-compliant integrated loudness/);
});

test('returns an explicitly heuristic tonal-center candidate from harmonic PCM', () => {
  const sampleRate = 8000;
  const duration = 2;
  const frequencies = [261.63, 329.63, 392.00]; // C major triad
  const samples = Array.from({ length: sampleRate * duration }, (_, i) =>
    frequencies.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * i / sampleRate), 0) / frequencies.length
  );
  const result = analyzeAudioSamples({ samples, sampleRate, frameSize: 2048 });
  assert.ok(result.tonal_center);
  assert.ok(['candidate', 'ambiguous', 'insufficient_evidence'].includes(result.tonal_center.status));
  assert.equal(result.tonal_center.method, 'Krumhansl-Schmuckler chroma profile correlation from windowed FFT');
  assert.ok(result.tonal_center.chroma === null || Object.keys(result.tonal_center.chroma).length === 12);
  assert.ok(result.tonal_center.confidence === null || (result.tonal_center.confidence >= 0 && result.tonal_center.confidence <= 1));
});

test('detects energy-change candidates without asserting musical section labels', () => {
  const sampleRate = 8000;
  const samples = Array.from({ length: sampleRate * 5 }, (_, i) => {
    const amplitude = i < sampleRate * 2 ? 0.04 : 0.4;
    return amplitude * Math.sin(2 * Math.PI * 220 * i / sampleRate);
  });
  const result = analyzeAudioSamples({ samples, sampleRate, frameSize: 1024 });
  assert.ok(Array.isArray(result.section_candidates));
  assert.ok(result.section_candidates.length >= 1);
  const transition = result.section_candidates[0];
  assert.equal(transition.status, 'candidate_transition');
  assert.ok(Math.abs(transition.time_seconds - 2) <= 1);
  assert.ok(Math.abs(transition.change_db) >= 5);
  assert.ok(!('section_label' in transition));
});

test('tracks temporal spectral changes separately from energy changes', () => {
  const sampleRate = 8000;
  const duration = 4;
  const samples = Array.from({ length: sampleRate * duration }, (_, i) => {
    const frequency = i < sampleRate * 2 ? 220 : 1800;
    return 0.25 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  });
  const result = analyzeAudioSamples({ samples, sampleRate, frameSize: 1024 });
  assert.ok(Array.isArray(result.spectral_curve));
  assert.ok(result.spectral_curve.length >= 3);
  assert.ok(Array.isArray(result.spectral_change_candidates));
  assert.ok(result.spectral_change_candidates.some(candidate => Math.abs(candidate.time_seconds - 2) <= 1));
  assert.ok(result.spectral_change_candidates.every(candidate => candidate.status === 'candidate_spectral_transition'));
  assert.ok(Array.isArray(result.combined_transition_candidates));
  assert.ok(result.combined_transition_candidates.some(candidate => candidate.evidence_types.includes('spectrum')));
});

test('estimates spectral novelty and recurring multi-window spectral sequences', () => {
  const sampleRate = 8000;
  const samples = Array.from({ length: sampleRate * 12 }, (_, i) => {
    const seconds = i / sampleRate;
    const frequency = seconds < 3 || (seconds >= 6 && seconds < 9) ? 220 : 1200;
    return 0.25 * Math.sin(2 * Math.PI * frequency * seconds);
  });
  const result = analyzeAudioSamples({ samples, sampleRate, frameSize: 1024 });
  assert.ok(Array.isArray(result.spectral_novelty_curve));
  assert.ok(result.spectral_novelty_candidates.some(candidate => Math.abs(candidate.time_seconds - 3) <= 1));
  assert.ok(Array.isArray(result.spectral_recurrence_candidates));
  assert.ok(result.spectral_recurrence_candidates.some(candidate =>
    Math.abs(candidate.first_window.start_seconds - candidate.second_window.start_seconds) >= 3
  ));
  assert.ok(result.spectral_recurrence_candidates.every(candidate => candidate.status === 'candidate_spectral_recurrence'));
  assert.ok(Array.isArray(result.spectral_sequence_recurrence_candidates));
  assert.ok(result.spectral_sequence_recurrence_candidates.some(candidate =>
    Math.abs(candidate.first_sequence.start_seconds - candidate.second_sequence.start_seconds) >= 5
  ));
  assert.ok(result.spectral_sequence_recurrence_candidates.every(candidate => candidate.status === 'candidate_spectral_sequence_recurrence'));
});

test('rejects invalid PCM input', () => {
  assert.throws(() => analyzeAudioSamples({ samples: [], sampleRate: 44100 }), /must not be empty/);
  assert.throws(() => analyzeAudioSamples({ samples: [0, NaN], sampleRate: 44100 }), /finite numbers/);
  assert.throws(() => analyzeAudioSamples({ samples: [0, 0, 0], sampleRate: 44100, channels: 2 }), /divisible by channels/);
});

test('integrates supplied PCM sample arrays into canonical acoustic dimensions', async () => {
  const sampleRate = 8000;
  const audio_samples = Array.from({ length: 2048 }, (_, i) => 0.2 * Math.sin(2 * Math.PI * 220 * i / sampleRate));
  const report = await analyzeMusicalSource(JSON.stringify({ events: [], audio_samples, sample_rate_hz: sampleRate }));
  assert.equal(report.musical_dimensions.loudness.status, 'observed');
  assert.equal(report.musical_dimensions.energy_structure.status, 'observed');
  assert.equal(report.musical_dimensions.spectrum.status, 'observed');
  assert.equal(report.musical_dimensions.key.status, 'inferred');
  assert.match(report.musical_dimensions.loudness.limitations[0], /LUFS/);
});
