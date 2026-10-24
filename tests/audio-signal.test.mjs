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
  assert.match(report.musical_dimensions.loudness.limitations[0], /LUFS/);
});
