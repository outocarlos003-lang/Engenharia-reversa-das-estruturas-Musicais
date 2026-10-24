export const MUSICAL_SCHEMA_VERSION = '0.1.0';

export function createMusicalRepresentation(input = {}) {
  return {
    schema_version: MUSICAL_SCHEMA_VERSION,
    source: input.source ?? null,
    timing: {
      bpm: input.timing?.bpm ?? null,
      meter: input.timing?.meter ?? null,
      grid: input.timing?.grid ?? null,
    },
    rhythm: input.rhythm ?? {},
    melody: input.melody ?? {},
    harmony: input.harmony ?? {},
    events: input.events ?? [],
    motifs: input.motifs ?? [],
    phrases: input.phrases ?? [],
    sections: input.sections ?? [],
    form: input.form ?? [],
    instrumentation: input.instrumentation ?? {},
    dynamics: input.dynamics ?? {},
    spatial: input.spatial ?? {},
    evidence: input.evidence ?? [],
    limitations: input.limitations ?? [],
  };
}

export function addEvidence(representation, item) {
  if (!item?.id || !item?.claim) throw new Error('Musical evidence requires id and claim');
  return createMusicalRepresentation({
    ...representation,
    evidence: [...(representation.evidence ?? []), item],
  });
}
