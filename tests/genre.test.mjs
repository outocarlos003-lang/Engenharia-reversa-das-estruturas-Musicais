import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGenre } from '../src/analysis/genre.mjs';

test('genre inference ranks reference profiles by structural similarity', () => {
  const representation = {
    rhythm: { family: 'syncopated' },
    harmony: { family: 'modal' },
    melody: { family: 'ornamental' },
    form: { role: 'recurrent' },
    instrumentation: { family: 'ensemble' },
    production: { family: 'dense' },
  };

  const result = classifyGenre(representation, [
    {
      genre: 'A',
      subgenre: 'A1',
      features: {
        rhythm: ['syncopated'],
        harmony: ['modal'],
        melody: ['ornamental'],
        instrumentation: ['ensemble'],
      },
    },
    {
      genre: 'B',
      features: {
        rhythm: ['straight'],
        harmony: ['tonal'],
      },
    },
  ]);

  assert.equal(result.best.genre, 'A');
  assert.equal(result.best.subgenre, 'A1');
  assert.ok(result.confidence > 0);
});

test('genre inference reports uncertainty when profiles are absent', () => {
  const result = classifyGenre({}, []);
  assert.equal(result.best, null);
  assert.equal(result.confidence, 0);
  assert.match(result.limitations[0], /perfis/);
});
