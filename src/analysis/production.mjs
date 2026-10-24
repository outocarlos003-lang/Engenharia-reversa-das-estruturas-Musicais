export function analyzeProduction(representation = {}) {
  const dynamics = representation?.dynamics ?? {};
  const instrumentation = representation?.instrumentation ?? {};
  const layers = Array.isArray(instrumentation.layers) ? instrumentation.layers : [];
  const effects = Array.isArray(representation?.production?.effects)
    ? representation.production.effects
    : [];

  const measuredDynamics = Array.isArray(dynamics.profile)
    ? dynamics.profile.map(Number).filter(Number.isFinite)
    : [];

  return {
    layer_count: layers.length,
    layers: layers.map((layer, index) => ({
      id: layer.id ?? `layer-${index + 1}`,
      instrument: layer.instrument ?? null,
      role: layer.role ?? null,
      register: layer.register ?? null,
    })),
    effects,
    dynamics: measuredDynamics.length
      ? {
          minimum: Math.min(...measuredDynamics),
          maximum: Math.max(...measuredDynamics),
          mean: measuredDynamics.reduce((a, b) => a + b, 0) / measuredDynamics.length,
        }
      : null,
    evidence_basis: [
      'instrumentation layer declarations',
      'supplied dynamics profile',
      'explicit production effects',
    ],
    confidence: layers.length || measuredDynamics.length || effects.length ? 0.65 : 0,
    limitations: layers.length || measuredDynamics.length || effects.length
      ? ['Production characteristics are supporting evidence and do not establish compositional intent without corroborating musical structure.']
      : ['No production evidence was supplied.'],
  };
}
