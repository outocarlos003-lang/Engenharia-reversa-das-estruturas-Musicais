import test from 'node:test';
import assert from 'node:assert/strict';
import { compareForm, inferForm } from '../src/analysis/form.mjs';

test('formal inference recognizes ternary recurrence', () => {
  const form = inferForm([
    { id: 's1', label: 'intro' },
    { id: 's2', label: 'contrast' },
    { id: 's3', label: 'intro' },
  ]);

  assert.equal(form.pattern, 'A-B-A');
  assert.equal(form.role, 'ternary');
  assert.equal(form.confidence, 0.7);
});

test('formal labels are relational rather than semantic claims', () => {
  const form = inferForm([
    { id: 's1', signature: 'x' },
    { id: 's2', signature: 'y' },
    { id: 's3', signature: 'x' },
  ]);

  assert.equal(form.sequence.join('-'), 'A-B-A');
  assert.match(form.limitations[0], /semantic/);
});

test('form comparison aligns section positions', () => {
  const comparison = compareForm(
    inferForm([{ signature: 'x' }, { signature: 'y' }, { signature: 'x' }]),
    inferForm([{ signature: 'x' }, { signature: 'z' }, { signature: 'x' }]),
  );

  assert.equal(comparison.similarity, 2 / 3);
  assert.equal(comparison.aligned[1].match, false);
});
