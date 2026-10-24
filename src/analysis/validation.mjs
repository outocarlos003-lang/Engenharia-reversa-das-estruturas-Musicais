const REQUIRED_RECONSTRUCTION_KEYS = Object.freeze([
  'schema_version',
  'timing',
  'harmony',
  'arrangement',
  'motifs',
  'instrumentation',
  'dynamics',
  'spatial',
  'aesthetics',
  'constraints',
]);

export function validateMusicalReport(report = {}) {
  const errors = [];
  const warnings = [];

  if (!report.target) errors.push('Analysis report requires a target.');
  if (!Array.isArray(report.events)) errors.push('events must be an array.');
  if (!Array.isArray(report.motifs)) errors.push('motifs must be an array.');
  if (!Array.isArray(report.sections)) errors.push('sections must be an array.');
  if (!Array.isArray(report.form) && typeof report.form !== 'object') errors.push('form must be an array or inferred form object.');

  if (report.reconstruction !== null && report.reconstruction !== undefined) {
    for (const key of REQUIRED_RECONSTRUCTION_KEYS) {
      if (!(key in report.reconstruction)) errors.push(`reconstruction is missing '${key}'.`);
    }
  } else {
    warnings.push('No reconstruction specification was produced.');
  }

  const confidenceValues = (report.observations ?? [])
    .map(item => Number(item?.confidence))
    .filter(Number.isFinite);

  if (confidenceValues.some(value => value < 0 || value > 1)) {
    errors.push('Observation confidence must be between 0 and 1.');
  }

  if (!report.genre?.length && !report.limitations?.some(item => /genre/i.test(item))) {
    warnings.push('Genre inference has no ranked candidates or explicit limitation.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checks: {
      evidence_confidence: confidenceValues.length > 0 || (report.observations ?? []).length === 0,
      reconstruction_shape: report.reconstruction == null || REQUIRED_RECONSTRUCTION_KEYS.every(key => key in report.reconstruction),
      composition_first: !('artifact' in report) && !('format' in (report.representation ?? {})),
    },
  };
}

export function assertValidMusicalReport(report) {
  const result = validateMusicalReport(report);
  if (!result.valid) throw new Error(`Invalid musical report: ${result.errors.join(' ')}`);
  return result;
}
