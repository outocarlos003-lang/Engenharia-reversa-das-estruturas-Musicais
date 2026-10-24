import test from 'node:test';
import assert from 'node:assert/strict';
import { createPipeline } from '../src/core/pipeline.mjs';
import { createMusicalRepresentation } from '../src/music/representation.mjs';
import { analyzeRhythm } from '../src/analysis/rhythm.mjs';
import { findMotifs } from '../src/analysis/motifs.mjs';
import { inferForm } from '../src/analysis/form.mjs';
import { classifyGenre } from '../src/analysis/genre.mjs';
import { analyzeAesthetics } from '../src/analysis/aesthetics.mjs';
import { buildReconstructionSpec } from '../src/analysis/reconstruction.mjs';

test('pipeline integrates musical reconstruction stages without file-format analysis', async () => {
  const pipeline = createPipeline({
    analyzers: {
      representation: () => createMusicalRepresentation({
        timing: { bpm: 120, meter: '4/4', grid: '1/16' },
        events: [
          { id: 'e1', signature: 'A', duration: 1 },
          { id: 'e2', signature: 'A', duration: 0.5 },
        ],
      }),
      tempo: () => ({ bpm: 120, meter: '4/4', confidence: 0.9 }),
      events: representation => representation.events,
      motifs: representation => findMotifs(representation),
      phrases: () => [{ id: 'p1', events: ['e1', 'e2'] }],
      sections: () => [
        { id: 's1', label: 'A', start: 0, end: 4, density: 0.4, signature: 'A' },
        { id: 's2', label: 'B', start: 4, end: 8, density: 0.7, signature: 'B' },
        { id: 's3', label: 'A', start: 8, end: 12, density: 0.4, signature: 'A' },
      ],
      form: (_representation, sections) => inferForm(sections),
      genre: ({ representation }) => classifyGenre(representation),
      aesthetics: ({ representation, form }) => analyzeAesthetics({ ...representation, form }),
      production: () => ({ layers: ['rhythm', 'harmony'] }),
      reconstruction: input => buildReconstructionSpec({
        source: 'synthetic-source',
        tempo: input.tempo,
        harmony: input.harmony,
        sections: input.sections,
        motifs: input.motifs,
        instrumentation: { layers: ['rhythm', 'harmony'] },
        dynamics: {},
        spatial: {},
        aesthetics: input.aesthetics,
      }),
    },
  });

  const report = await pipeline.analyze('synthetic-source');

  assert.equal(report.representation.tempo.bpm, 120);
  assert.equal(report.events.length, 2);
  assert.equal(report.motifs.length, 1);
  assert.equal(report.form.pattern, 'A-B-A');
  assert.ok(Array.isArray(report.genre));
  assert.equal(report.reconstruction.timing.bpm, 120);
  assert.equal(Object.hasOwn(report, 'artifact'), false);
  assert.equal(Object.hasOwn(report.representation, 'format'), false);
});

test('pipeline remains safe when optional analyzers are absent', async () => {
  const report = await createPipeline().analyze('synthetic-source');

  assert.equal(report.target, 'synthetic-source');
  assert.deepEqual(report.events, []);
  assert.deepEqual(report.motifs, []);
  assert.equal(report.reconstruction, null);
});

test('pipeline can expose rhythm evidence through an analyzer adapter', async () => {
  const report = await createPipeline({
    analyzers: {
      representation: () => createMusicalRepresentation({
        events: [{ id: 'e1', duration: 1 }, { id: 'e2', duration: 0.5 }],
      }),
      features: representation => analyzeRhythm(representation),
    },
  }).analyze('synthetic-source');

  assert.equal(report.representation.events.length, 2);
});
