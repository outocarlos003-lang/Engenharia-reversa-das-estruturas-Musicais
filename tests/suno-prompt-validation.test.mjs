import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const validator = new URL('../scripts/validate-suno-prompt.mjs', import.meta.url);

function run(prompt) {
  return spawnSync(process.execPath, [validator.pathname, prompt], { encoding: 'utf8' });
}

test('accepts a non-empty prompt at or below 850 characters', () => {
  const result = run('a'.repeat(850));
  assert.equal(result.status, 0);
  assert.match(result.stdout, /850\/850/);
});

test('rejects prompts longer than 850 characters', () => {
  const result = run('a'.repeat(851));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /851 caracteres/);
});

test('rejects an empty prompt', () => {
  const result = run('');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vazio|informe o prompt/);
});

test('counts Unicode characters rather than UTF-16 code units', () => {
  const result = run('😀'.repeat(850));
  assert.equal(result.status, 0);
  assert.match(result.stdout, /850\/850/);
});
