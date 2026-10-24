export function compareReports(reference, candidate) {
  const metrics = {
    duration: similarity(reference.artifact?.duration, candidate.artifact?.duration),
    tempo: similarity(reference.observations?.find(x => x.claim === 'tempo')?.value?.bpm, candidate.observations?.find(x => x.claim === 'tempo')?.value?.bpm),
    sections: sequenceSimilarity(reference.sections ?? [], candidate.sections ?? [], 'label'),
    motifs: sequenceSimilarity(reference.motifs ?? [], candidate.motifs ?? [], 'id'),
  };

  return {
    schema_version: '0.1.0',
    metrics,
    deviations: Object.entries(metrics)
      .filter(([, value]) => value !== null && value < 0.9)
      .map(([metric, value]) => ({ metric, similarity: value })),
    limitations: ['Similarity metrics are structural indicators, not perceptual truth.'],
  };
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
