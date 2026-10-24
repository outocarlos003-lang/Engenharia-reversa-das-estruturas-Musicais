const DEFAULT_FEATURE_WEIGHTS = Object.freeze({
  rhythm: 0.2,
  harmony: 0.15,
  melody: 0.15,
  form: 0.15,
  instrumentation: 0.2,
  production: 0.15,
});

function numeric(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function scoreProfile(representation, profile) {
  let score = 0;
  let weight = 0;
  const weights = { ...DEFAULT_FEATURE_WEIGHTS, ...(profile.weights ?? {}) };

  for (const [dimension, dimensionWeight] of Object.entries(weights)) {
    const expected = profile.features?.[dimension];
    if (expected === undefined) continue;

    const actual = representation?.[dimension];
    let similarity = null;

    if (typeof expected === 'function') similarity = expected(actual, representation);
    else if (Array.isArray(expected)) {
      const value = typeof actual === 'string' ? actual : actual?.family ?? actual?.type;
      similarity = value !== undefined && expected.includes(value) ? 1 : 0;
    } else if (typeof expected === 'number') {
      const value = numeric(actual?.value ?? actual);
      similarity = value === null ? null : Math.max(0, 1 - Math.abs(value - expected) / Math.max(1, Math.abs(expected)));
    }

    if (Number.isFinite(similarity)) {
      score += similarity * dimensionWeight;
      weight += dimensionWeight;
    }
  }

  return weight ? score / weight : 0;
}

export function classifyGenre(representation, profiles = []) {
  const candidates = profiles
    .map(profile => ({
      genre: profile.genre,
      subgenre: profile.subgenre ?? null,
      score: scoreProfile(representation, profile),
      evidence_basis: profile.evidence_basis ?? [],
    }))
    .filter(candidate => candidate.genre)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0] ?? null;
  const second = candidates[1] ?? null;
  const margin = best && second ? best.score - second.score : best?.score ?? 0;

  return {
    candidates,
    best: best ? { ...best, confidence: Math.min(1, best.score * 0.8 + margin * 0.2) } : null,
    confidence: best ? Math.min(1, best.score * 0.8 + margin * 0.2) : 0,
    limitations: profiles.length
      ? ['Genre inference depends on the supplied reference profiles and should not be treated as an ontological label.']
      : ['No foram fornecidos perfis de referência; a inferência de gênero está indisponível.'],
  };
}

export { DEFAULT_FEATURE_WEIGHTS };
