import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSpatial } from '../src/analysis/spatial.mjs';
import { analyzeProduction } from '../src/analysis/production.mjs';

test('spatial analysis summarizes supplied channel geometry', () => {
  const result = analyzeSpatial({
    spatial: {
      channels: [
        { id: 'lead', pan: -0.5, width: 0.2, depth: 0.3 },
        { id: 'pad', pan: 0.5, width: 1, depth: 0.7 },
      ],
    },
  });

  assert.equal(result.channels.length, 2);
  assert.equal(result.panorama.min, -0.5);
  assert.equal(result.panorama.max, 0.5);
  assert.equal(result.width.mean, 0.6);
});

test('spatial analysis does not invent missing measurements', () => {
  const result = analyzeSpatial({ spatial: { channels: [{ id: 'x' }] } });
  assert.equal(result.panorama, null);
  assert.equal(result.width, null);
  assert.equal(result.depth, null);
});

test('production analysis treats production as supporting evidence', () => {
  const result = analyzeProduction({
    instrumentation: { layers: [{ id: 'bass', instrument: 'bass', role: 'foundation' }] },
    dynamics: { profile: [-18, -12, -6] },
    production: { effects: ['reverb'] },
  });

  assert.equal(result.layer_count, 1);
  assert.equal(result.dynamics.mean, -12);
  assert.equal(result.effects[0], 'reverb');
  assert.match(result.limitations[0], /supporting evidence/);
});
