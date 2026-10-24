import test from 'node:test';
import assert from 'node:assert/strict';
import { evidence, analysisReport } from '../src/core/model.mjs';
import { buildReconstructionSpec } from '../src/analysis/reconstruction.mjs';

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
