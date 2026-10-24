function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function analyzeAesthetics(representation = {}) {
  const sections = representation.sections ?? [];
  const dynamics = representation.dynamics?.profile ?? [];
  const contrasts = sections.map(section => Number(section.contrast)).filter(Number.isFinite);
  const densities = sections.map(section => Number(section.density)).filter(Number.isFinite);

  const dynamicMean = mean(dynamics.map(item => Number(item.value)).filter(Number.isFinite));
  const contrastMean = mean(contrasts);
  const densityMean = mean(densities);

  const dimensions = {
    contrast: contrastMean,
    dynamic_intensity: dynamicMean,
    density: densityMean,
    recurrence: representation.form?.pattern ? 1 : null,
  };

  const available = Object.values(dimensions).filter(value => value !== null);
  const confidence = available.length ? clamp(0.45 + available.length * 0.1) : 0;

  return {
    dimensions,
    character_hypotheses: [],
    confidence,
    evidence_basis: available.length
      ? ['measured or explicitly supplied structural and production descriptors']
      : [],
    limitations: available.length
      ? ['Aesthetic character is interpretive; these dimensions do not establish authorial intent.']
      : ['No suitable musical descriptors were supplied; aesthetic inference is unavailable.'],
  };
}
