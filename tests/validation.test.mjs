import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMusicalReport } from '../src/analysis/validation.mjs';

test('validation accepts a complete composition-first report', () => {
  const result = validateMusicalReport({
    target: 'synthetic-source',
    representation: { events: [] },
    observations: [{ id: 'tempo', claim: 'tempo', confidence: 0.8 }],
    events: [],
    motifs: [],
    sections: [],
    form: [],
    genre: [{ genre: 'electronic', score: 0.6 }],
    reconstruction: {
      schema_version: '0.1.0',
      timing: {},
      harmony: {},
      arrangement: [],
      motifs: [],
      instrumentation: {},
      dynamics: {},
      spatial: {},
      aesthetics: {},
      constraints: [],
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.checks.composition_first, true);
});

test('validation rejects confidence outside epistemic range', () => {
  const result = validateMusicalReport({
    target: 'synthetic-source',
    observations: [{ id: 'bad', claim: 'bad', confidence: 1.2 }],
    events: [],
    motifs: [],
    sections: [],
    form: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors[0], /between 0 and 1/);
});

test('validation rejects file-format concepts at report level', () => {
  const result = validateMusicalReport({
    target: 'synthetic-source',
    artifact: { format: 'wav' },
    representation: { format: 'wav', events: [] },
    events: [],
    motifs: [],
    sections: [],
    form: [],
  });

  assert.equal(result.checks.composition_first, false);
});
