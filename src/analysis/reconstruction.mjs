export function buildReconstructionSpec(input) {
  return {
    schema_version: '0.1.0',
    source: input.source ?? null,
    timing: {
      bpm: input.tempo?.bpm ?? null,
      meter: input.tempo?.meter ?? null,
      grid: input.tempo?.grid ?? null,
    },
    harmony: input.harmony ?? {},
    arrangement: (input.sections ?? []).map(section => ({
      id: section.id,
      label: section.label,
      start: section.start,
      end: section.end,
      density: section.density ?? null,
      layers: section.layers ?? [],
      transitions: section.transitions ?? [],
    })),
    motifs: input.motifs ?? [],
    instrumentation: input.instrumentation ?? {},
    dynamics: input.dynamics ?? {},
    stereo: input.stereo ?? {},
    aesthetics: input.aesthetics ?? {},
    constraints: [
      'Preserve structural relationships before timbral details.',
      'Keep measured facts separate from inferred musical labels.',
      'Record uncertainty for ambiguous boundaries or harmonic estimates.',
    ],
  };
}
