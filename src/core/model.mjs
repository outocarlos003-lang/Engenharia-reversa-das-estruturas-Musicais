export const OBSERVATION_TYPES = Object.freeze({
  MEASURED: 'measured',
  INFERRED: 'inferred',
  INTERPRETED: 'interpreted',
});

export function evidence({ id, claim, value, type = OBSERVATION_TYPES.MEASURED, confidence = 1, sources = [], limitations = [] }) {
  if (!id || !claim) throw new Error('Evidence requires id and claim');
  return { id, claim, value, type, confidence, sources, limitations };
}

export function analysisReport(input) {
  return {
    schema_version: '0.1.0',
    target: input.target,
    artifact: input.artifact ?? null,
    observations: input.observations ?? [],
    events: input.events ?? [],
    motifs: input.motifs ?? [],
    sections: input.sections ?? [],
    form: input.form ?? [],
    genre: input.genre ?? [],
    aesthetics: input.aesthetics ?? {},
    production: input.production ?? {},
    reconstruction: input.reconstruction ?? null,
    limitations: input.limitations ?? [],
  };
}
