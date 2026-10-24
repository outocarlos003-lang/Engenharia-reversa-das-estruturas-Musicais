export function compareReports(reference, candidate) {
  const metrics = {
    tempo: similarity(findClaim(reference, 'tempo')?.bpm, findClaim(candidate, 'tempo')?.bpm),
    sections: sequenceSimilarity(reference.sections ?? [], candidate.sections ?? [], 'label'),
    motifs: sequenceSimilarity(reference.motifs ?? [], candidate.motifs ?? [], 'id'),
    phrases: sequenceSimilarity(reference.phrases ?? [], candidate.phrases ?? [], 'id'),
    form: sequenceSimilarity(reference.form ?? [], candidate.form ?? [], 'label'),
    instrumentation: objectSimilarity(reference.representation?.instrumentation, candidate.representation?.instrumentation),
  };

  return {
    schema_version: '0.1.0',
    metrics,
    deviations: Object.entries(metrics)
      .filter(([, value]) => value !== null && value < 0.9)
      .map(([metric, value]) => ({ metric, similarity: value })),
    limitations: ['Similarity metrics compare musical structure; they are not perceptual truth.'],
  };
}

function findClaim(report, claim) {
  return report.observations?.find(item => item.claim === claim)?.value
    ?? report.representation?.[claim];
}

function similarity(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  if (a === 0 && b === 0) return 1;
  return Math.max(0, 1 - Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9));
}

function sequenceSimilarity(a, b, key) {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const matches = a.filter((x, i) => x?.[key] === b[i]?.[key]).length;
  return matches / Math.max(a.length, b.length);
}

function objectSimilarity(a, b) {
  if (!a || !b) return null;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (!keys.size) return 1;
  const matches = [...keys].filter(key => JSON.stringify(a[key]) === JSON.stringify(b[key])).length;
  return matches / keys.size;
}
