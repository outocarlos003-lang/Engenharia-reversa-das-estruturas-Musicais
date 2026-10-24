import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMusicalSource, runMusicalTool } from '../src/analysis/analyzer.mjs';

const source = JSON.stringify({
  tempo: { bpm: 120 }, meter: '4/4',
  events: [
    { start: 0, duration: 0.5, pitch: 60 },
    { start: 0.5, duration: 0.5, pitch: 64 },
    { start: 1, duration: 0.5, pitch: 60 },
    { start: 1.5, duration: 0.5, pitch: 67 }
  ],
  sections: [{ id: 'A', start: 0, end: 2 }]
});

test('structured source produces events, melody and evidence', async () => {
  const report = await analyzeMusicalSource(source);
  assert.equal(report.events.length, 4);
  assert.deepEqual(report.representation.melody.intervals, [4, -4, 7]);
  assert.ok(report.observations.length > 0);
  assert.ok(report.limitations.some(x => x.includes('áudio bruto')));
});

test('MCP tool returns data instead of a placeholder', async () => {
  const result = await runMusicalTool('analyze_rhythmic_structure', source);
  assert.equal(result.data.event_count, 4);
  assert.ok(Array.isArray(result.data.inter_onset_intervals));
});

test('genre classifier does not invent labels', async () => {
  const result = await runMusicalTool('classify_genre', source);
  assert.equal(result.data.status, 'insufficient evidence for automatic classification');
});

test('invalid musical event is rejected with a useful error', async () => {
  await assert.rejects(() => analyzeMusicalSource(JSON.stringify({events:[{start:'not-time'}]})), /start must be numeric/);
});
