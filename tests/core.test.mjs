import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evidence, analysisReport } from '../src/core/model.mjs';
import { buildReconstructionSpec } from '../src/analysis/reconstruction.mjs';
import { inspectWav } from '../src/adapters/wav.mjs';

function syntheticWav({ sampleRate = 8000, channels = 1, seconds = 1, bits = 16 } = {}) {
  const samples = sampleRate * seconds;
  const bytesPerSample = bits / 8;
  const dataSize = samples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bits, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

test('evidence preserves epistemic type and confidence', () => {
  const item = evidence({ id: 'x', claim: 'tempo', value: 100, type: 'measured', confidence: 1 });
  assert.equal(item.type, 'measured');
  assert.equal(item.confidence, 1);
});

test('analysis report keeps hierarchy empty-safe', () => {
  const report = analysisReport({ target: 'synthetic-fixture.wav' });
  assert.deepEqual(report.sections, []);
  assert.deepEqual(report.motifs, []);
});

test('reconstruction spec preserves section order', () => {
  const spec = buildReconstructionSpec({
    tempo: { bpm: 120, meter: '4/4' },
    sections: [
      { id: 's1', label: 'intro', start: 0, end: 8 },
      { id: 's2', label: 'chorus', start: 8, end: 24 },
    ],
  });
  assert.deepEqual(spec.arrangement.map(x => x.label), ['intro', 'chorus']);
});

test('WAV adapter measures a synthetic fixture without external music', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'erm-'));
  const file = join(dir, 'fixture.wav');
  await writeFile(file, syntheticWav({ sampleRate: 8000, channels: 2, seconds: 2 }));
  try {
    const artifact = await inspectWav(file);
    assert.equal(artifact.format.sample_rate, 8000);
    assert.equal(artifact.format.channels, 2);
    assert.equal(artifact.duration, 2);
    assert.equal(artifact.codec, 'PCM');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
