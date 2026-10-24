const DIMENSIONS = Object.freeze([
  ['emotional_tone', 'Tom emocional'],
  ['production', 'Produção'],
  ['thematic_content', 'Temática'],
  ['cultural_context', 'Contexto cultural'],
  ['primary_genres', 'Gêneros principais'],
  ['secondary_genres', 'Gêneros secundários'],
  ['tempo', 'Andamento'],
  ['key', 'Tonalidade'],
  ['loudness', 'Loudness'],
  ['energy_structure', 'Estrutura de energia'],
  ['spectrum', 'Espectro'],
  ['stereo', 'Estéreo'],
]);

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function record(id, value, status, limitations, extras = {}) {
  return {
    id,
    value,
    unit: extras.unit ?? null,
    time_range: extras.time_range ?? 'global',
    method: extras.method ?? null,
    evidence: extras.evidence ?? [],
    confidence: Number.isFinite(extras.confidence)
      ? Math.max(0, Math.min(1, extras.confidence))
      : null,
    status,
    limitations,
  };
}

/**
 * Builds the canonical twelve-dimension record without fabricating missing data.
 * Explicit source annotations take precedence over conservative derivations.
 */
export function buildMusicalDimensions(source = {}, representation = {}) {
  const supplied = source.musical_dimensions ?? {};
  const dims = {};

  for (const [id, label] of DIMENSIONS) {
    const explicit = supplied[id];
    if (explicit && typeof explicit === 'object' && 'value' in explicit) {
      dims[id] = record(
        id,
        explicit.value,
        explicit.status ?? (hasValue(explicit.value) ? 'observed' : 'unknown'),
        Array.isArray(explicit.limitations) ? explicit.limitations : ['Explicit annotation supplied without limitations metadata.'],
        {
          unit: explicit.unit,
          time_range: explicit.time_range ?? 'global',
          method: explicit.method ?? 'source annotation',
          evidence: Array.isArray(explicit.evidence) ? explicit.evidence : [],
          confidence: explicit.confidence,
        },
      );
      continue;
    }

    if (id === 'tempo' && hasValue(representation.tempo?.bpm)) {
      dims[id] = record(id, representation.tempo.bpm, 'inferred', [
        'Estimated from symbolic event onsets or supplied tempo metadata; audio-based beat tracking was not performed.',
      ], { unit: 'BPM', method: source.tempo?.bpm != null ? 'source tempo metadata' : 'median inter-onset interval', evidence: ['symbolic event onsets'], confidence: source.tempo?.bpm != null ? 0.95 : 0.6 });
      continue;
    }

    if (id === 'production' && hasValue(source.production)) {
      dims[id] = record(id, source.production, 'observed', [
        'Describes supplied metadata; no audio signal was inspected to verify audible production characteristics.',
      ], { method: 'source metadata', evidence: ['source.production'], confidence: 0.6 });
      continue;
    }

    if (id === 'energy_structure' && (hasValue(source.energy_structure) || hasValue(source.dynamics?.profile))) {
      const value = source.energy_structure ?? { dynamics_profile: source.dynamics.profile };
      dims[id] = record(id, value, 'observed', [
        'Energy is represented only by supplied dynamics/profile data; no audio RMS, LUFS, or transient analysis was performed.',
      ], { method: source.energy_structure ? 'source energy metadata' : 'supplied dynamics profile', evidence: ['source dynamics metadata'], confidence: 0.6 });
      continue;
    }

    if (id === 'stereo' && hasValue(source.spatial)) {
      dims[id] = record(id, source.spatial, 'observed', [
        'Spatial values originate from source metadata and were not measured from stereo audio channels.',
      ], { method: 'source spatial metadata', evidence: ['source.spatial'], confidence: 0.6 });
      continue;
    }

    if (id === 'primary_genres' || id === 'secondary_genres') {
      dims[id] = record(id, [], 'not_assessed', [
        'No validated genre reference profiles or explicit genre annotations were supplied.',
      ], { method: null, evidence: [] });
      continue;
    }

    dims[id] = record(id, null, 'unknown', [
      `Insufficient evidence to determine ${label.toLowerCase()} from the supplied symbolic events and metadata.`,
    ]);
  }

  return { schema_version: '0.1.0', scope: 'global', ...dims };
}
