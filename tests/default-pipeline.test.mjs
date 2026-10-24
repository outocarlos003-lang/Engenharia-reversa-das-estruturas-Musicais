import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultPipeline } from '../src/core/default-pipeline.mjs';

test('default pipeline executes the complete structural chain', async () => {
  const pipeline = createDefaultPipeline();
  const report = await pipeline.analyze({
    source: 'synthetic-musical-source',
    timing: { bpm: 120, meter: '4/4', grid: '1/16' },
    events: [
      { id: 'e1', type: 'note', pitch: 60, duration: 1, signature: 'A' },
      { id: 'e2', type: 'note', pitch: 62, duration: 1, signature: 'B' },
      { id: 'e3', type: 'note', pitch: 60, duration: 1, signature: 'A' },
    ],
    sections: [
      { id: 's1', label: 'intro', signature: 'x' },
      { id: 's2', label: 'contrast', signature: 'y' },
      { id: 's3', label: 'return', signature: 'x' },
    ],
  });

  assert.equal(report.target.source, 'synthetic-musical-source');
  assert.ok(Array.isArray(report.events));
  assert.ok(Array.isArray(report.motifs));
  assert.ok(Array.isArray(report.phrases));
  assert.ok(Array.isArray(report.sections));
  assert.ok(report.form);
  assert.ok(report.genre);
  assert.ok(report.aesthetics);
  assert.ok(report.production);
  assert.ok(report.reconstruction);
  assert.ok(report.reconstruction.semantics);
  assert.ok(report.validation);
  assert.equal(report.validation.valid, true);
});

test('default pipeline never introduces a file-format model layer', async () => {
  const report = await createDefaultPipeline().analyze({ source: 'synthetic' });

  assert.equal(Object.hasOwn(report, 'artifact'), false);
  assert.equal(Object.hasOwn(report.representation, 'format'), false);
  assert.equal(Object.hasOwn(report.representation, 'codec'), false);
});
