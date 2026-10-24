function normalizeSection(section, index) {
  return {
    id: section?.id ?? `section-${index + 1}`,
    label: section?.label ?? null,
    start: section?.start ?? null,
    end: section?.end ?? null,
    density: section?.density ?? null,
    layers: section?.layers ?? [],
    transitions: section?.transitions ?? [],
  };
}

export function buildReconstructionSpec(input = {}) {
  const sections = input.sections ?? [];

  return {
    schema_version: '0.2.0',
    source: input.source ?? null,
    timing: {
      bpm: input.tempo?.bpm ?? input.timing?.bpm ?? null,
      meter: input.tempo?.meter ?? input.timing?.meter ?? null,
      grid: input.tempo?.grid ?? input.timing?.grid ?? null,
    },
    rhythm: input.rhythm ?? {},
    melody: input.melody ?? {},
    harmony: input.harmony ?? {},
    events: input.events ?? [],
    phrases: input.phrases ?? [],
    motifs: input.motifs ?? [],
    form: input.form ?? [],
    arrangement: sections.map(normalizeSection),
    instrumentation: input.instrumentation ?? {},
    dynamics: input.dynamics ?? {},
    spatial: input.spatial ?? {},
    aesthetics: input.aesthetics ?? {},
    semantics: input.semantics ?? {},
    genre: input.genre ?? [],
    constraints: [
      'Preserve structural relationships before timbral details.',
      'Keep measured facts separate from inferred musical labels.',
      'Record uncertainty for ambiguous boundaries or harmonic estimates.',
      'Treat genre, aesthetics and semantic cues as hypotheses rather than construction rules.',
      'Do not require a specific file format for reconstruction.',
    ],
    validation: {
      required_layers: ['timing', 'events', 'sections', 'form'],
      unresolved: input.unresolved ?? [],
    },
  };
}
