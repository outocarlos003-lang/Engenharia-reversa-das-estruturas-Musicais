const ROLE_HINTS = Object.freeze({
  tension: ['dissonance', 'instability', 'density-rise', 'dynamic-rise'],
  release: ['consonance', 'stability', 'density-fall', 'dynamic-fall'],
  contrast: ['section-change', 'instrument-change', 'register-change', 'density-change'],
  continuity: ['recurrence', 'ostinato', 'stable-harmony', 'stable-texture'],
});

export function inferSemanticCues(input = {}) {
  const cues = [];
  const evidence = input.evidence ?? [];
  const tags = new Set(input.tags ?? []);

  for (const [cue, hints] of Object.entries(ROLE_HINTS)) {
    const matches = hints.filter(hint => tags.has(hint) || evidence.some(item => item?.claim === hint));
    if (!matches.length) continue;

    cues.push({
      cue,
      basis: matches,
      type: 'interpreted',
      confidence: Math.min(0.85, 0.45 + matches.length * 0.1),
    });
  }

  return {
    cues,
    confidence: cues.length ? Math.min(...cues.map(cue => cue.confidence)) : 0,
    limitations: cues.length
      ? ['Semantic cues describe plausible musical functions and affective tendencies, not fixed meanings.']
      : ['No semantic cues were inferred because no explicit structural evidence was supplied.'],
  };
}
