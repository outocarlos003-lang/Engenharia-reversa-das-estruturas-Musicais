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

    const audio = source.audio_analysis;
    if (audio && id === 'key' && audio.tonal_center && audio.tonal_center.tonic) {
      const tonal = audio.tonal_center;
      dims[id] = record(id, tonal, 'inferred', tonal.limitations ?? [
        'Tonalidade candidata estimada por correlação de perfil cromático; não equivale a análise harmônica validada.',
      ], { method: tonal.method, evidence: ['audio_analysis.tonal_center.chroma'], confidence: tonal.confidence });
      continue;
    }
    if (audio && id === 'loudness') {
      dims[id] = record(id, { peak_dbfs: audio.peak_dbfs, rms_dbfs: audio.rms_dbfs, crest_factor_db: audio.crest_factor_db }, 'observed', [
        'Medição de pico e RMS em dBFS; não equivale a loudness integrado em LUFS nem a true peak em dBTP.',
      ], { unit: 'dBFS', method: audio.method ?? 'normalized PCM sample analysis', evidence: ['audio_analysis.peak_dbfs', 'audio_analysis.rms_dbfs'], confidence: 0.98 });
      continue;
    }
    if (audio && id === 'energy_structure') {
      dims[id] = record(id, { curve: audio.energy_curve, section_candidates: audio.section_candidates ?? [] }, 'observed', [
        'Curva calculada por janelas de RMS de 100 ms; transições são candidatas baseadas em mudanças de nível, não fronteiras musicais confirmadas.',
        'Variações de masterização, dinâmica, pausas ou eventos isolados podem gerar candidatos; a detecção não classifica verso, refrão ou ponte.',
      ], { unit: 'RMS / dBFS / seconds', method: 'RMS por janela de 100 ms e detector heurístico de mudanças entre bins de 1 s', evidence: ['audio_analysis.energy_curve', 'audio_analysis.section_candidates'], confidence: 0.75 });
      continue;
    }
    if (audio && id === 'spectrum' && hasValue(audio.spectrum)) {
      dims[id] = record(id, audio.spectrum, 'observed', [
        'Descritores espectrais estimados por FFT em janelas; não identificam instrumentos nem técnicas de produção por si sós.',
      ], { unit: 'Hz / proporção de energia', method: 'windowed FFT spectral descriptors', evidence: ['audio_analysis.spectrum'], confidence: 0.85 });
      continue;
    }
    if (audio && id === 'stereo' && hasValue(audio.stereo)) {
      dims[id] = record(id, audio.stereo, 'observed', [
        'Correlação e relação side/mid calculadas nos canais fornecidos; não substituem avaliação perceptiva de panorama ou compatibilidade mono.',
      ], { unit: 'correlation / dB', method: 'L/R channel correlation and mid-side energy', evidence: ['audio_analysis.stereo'], confidence: 0.9 });
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
