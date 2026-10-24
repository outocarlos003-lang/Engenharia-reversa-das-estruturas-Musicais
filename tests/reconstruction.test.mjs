import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReconstructionSpec } from '../src/analysis/reconstruction.mjs';

test('reconstruction preserves musical hierarchy and spatial structure', () => {
  const spec = buildReconstructionSpec({
    source: 'synthetic-analysis',
    tempo: { bpm: 120, meter: '4/4', grid: '1/16' },
    harmony: { tonic: 'D', mode: 'minor' },
    sections: [
      { id: 's1', label: 'A', start: 0, end: 8, density: 0.4, layers: ['bass'], transitions: [] },
      { id: 's2', label: 'B', start: 8, end: 16, density: 0.8, layers: ['bass', 'lead'], transitions: ['rise'] },
    ],
    motifs: [{ id: 'm1', signature: 'x-y-z' }],
    instrumentation: { roles: ['bass', 'lead'] },
    dynamics: { profile: [{ value: 0.4 }, { value: 0.8 }] },
    spatial: { width: 0.7 },
    aesthetics: { dimensions: { contrast: 0.5 } },
  });

  assert.equal(spec.timing.bpm, 120);
  assert.equal(spec.arrangement.length, 2);
  assert.equal(spec.motifs[0].id, 'm1');
  assert.deepEqual(spec.spatial, { width: 0.7 });
  assert.equal(spec.stereo, undefined);
});

test('reconstruction keeps uncertainty as an explicit constraint', () => {
  const spec = buildReconstructionSpec({ sections: [] });

  assert.ok(spec.constraints.some(item => /uncertainty/i.test(item)));
  assert.deepEqual(spec.arrangement, []);
});
