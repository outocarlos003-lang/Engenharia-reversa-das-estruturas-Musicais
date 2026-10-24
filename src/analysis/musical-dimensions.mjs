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
  ['instrumental_sound_sources', 'Instrumental / fontes sonoras'],
  ['mechanical_voice_analysis', 'Identificação e análise mecânica da voz'],
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
 * Builds the canonical fourteen-dimension record without fabricating missing data.
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
      dims[id] = record(id, { curve: audio.energy_curve, section_candidates: audio.section_candidates ?? [], combined_transition_candidates: audio.combined_transition_candidates ?? [] }, 'observed', [
        'Curva calculada por janelas de RMS de 100 ms; transições são candidatas baseadas em mudanças de nível, não fronteiras musicais confirmadas.',
        'Variações de masterização, dinâmica, pausas ou eventos isolados podem gerar candidatos; a detecção não classifica verso, refrão ou ponte.',
      ], { unit: 'RMS / dBFS / seconds', method: 'RMS por janela de 100 ms e detector heurístico de mudanças entre bins de 1 s', evidence: ['audio_analysis.energy_curve', 'audio_analysis.section_candidates', 'audio_analysis.combined_transition_candidates'], confidence: 0.75 });
      continue;
    }
    if (audio && id === 'spectrum' && hasValue(audio.spectrum)) {
      dims[id] = record(id, { summary: audio.spectrum, temporal_curve: audio.spectral_curve ?? [], change_candidates: audio.spectral_change_candidates ?? [], novelty_curve: audio.spectral_novelty_curve ?? [], novelty_candidates: audio.spectral_novelty_candidates ?? [], recurrence_candidates: audio.spectral_recurrence_candidates ?? [], sequence_recurrence_candidates: audio.spectral_sequence_recurrence_candidates ?? [] }, 'observed', [
        'Descritores espectrais estimados por FFT; mudanças temporais não identificam instrumentos nem provam fronteiras formais.',
        'Entrada de instrumentos, transientes, ruído e mudanças de arranjo podem alterar o centroide e a distribuição por bandas.',
      ], { unit: 'Hz / proporção de energia / seconds', method: 'windowed FFT spectral descriptors and 1-second temporal summaries', evidence: ['audio_analysis.spectrum', 'audio_analysis.spectral_curve', 'audio_analysis.spectral_change_candidates', 'audio_analysis.spectral_novelty_curve', 'audio_analysis.spectral_novelty_candidates', 'audio_analysis.spectral_recurrence_candidates', 'audio_analysis.spectral_sequence_recurrence_candidates'], confidence: 0.75 });
      continue;
    }
    if (id === 'mechanical_voice_analysis') {
      const regions = source.vocal_regions ?? source.voice_regions ?? source.vocal_segments ?? null;
      const validRegions = Array.isArray(regions) ? regions.filter(region =>
        region && Number.isFinite(region.start_seconds) && Number.isFinite(region.end_seconds) &&
        region.start_seconds >= 0 && region.end_seconds > region.start_seconds
      ).map(region => ({
        start_seconds: region.start_seconds,
        end_seconds: region.end_seconds,
        annotation: region.annotation ?? 'vocal_region',
        confidence: Number.isFinite(region.confidence) ? Math.max(0, Math.min(1, region.confidence)) : null,
        source: region.source ?? 'source annotation',
      })) : [];
      if (validRegions.length && !hasValue(source.voice_analysis ?? source.vocal_analysis ?? representation.voice_analysis) && !(audio && Array.isArray(audio.fundamental_frequency_track) && audio.fundamental_frequency_track.length)) {
        dims[id] = record(id, {
          vocal_regions: validRegions,
          vocal_source_confirmed: true,
          confirmation_method: 'explicit source annotation',
          voice_specific_analysis: null,
        }, 'observed', [
          'Os intervalos vocais foram fornecidos como anotação de origem; o motor não detectou nem validou automaticamente a presença de voz.',
          'Regiões anotadas não fornecem, por si só, F0, formantes, técnica vocal ou identidade da fonte.',
        ], { unit: 'seconds', method: 'explicit vocal-region annotation', evidence: ['source.vocal_regions / source.voice_regions / source.vocal_segments'], confidence: null });
        continue;
      }
    }

    if (audio && id === 'mechanical_voice_analysis' && Array.isArray(audio.fundamental_frequency_track) && audio.fundamental_frequency_track.length) {
      const regions = source.vocal_regions ?? source.voice_regions ?? source.vocal_segments ?? null;
      const validRegions = Array.isArray(regions) ? regions.filter(region =>
        region && Number.isFinite(region.start_seconds) && Number.isFinite(region.end_seconds) &&
        region.start_seconds >= 0 && region.end_seconds > region.start_seconds
      ).map(region => ({
        start_seconds: region.start_seconds,
        end_seconds: region.end_seconds,
        annotation: region.annotation ?? 'vocal_region',
        confidence: Number.isFinite(region.confidence) ? Math.max(0, Math.min(1, region.confidence)) : null,
        source: region.source ?? 'source annotation',
      })) : [];
      dims[id] = record(id, {
        acoustic_f0_track: audio.fundamental_frequency_track,
        vocal_regions: validRegions,
        vocal_source_confirmed: validRegions.length > 0,
        vocal_region_confirmation_method: validRegions.length ? 'explicit source annotation' : null,
        voice_specific_analysis: null,
      }, 'inferred', [
        'A trilha de F0 é uma estimativa de periodicidade acústica e não confirma que a fonte seja voz humana; instrumentos monofônicos também podem produzir candidatos semelhantes.',
        'A autocorrelação pode apresentar erros de oitava e falhar em fala não sonora, respirações, ruído, polifonia ou áudio com reverberação.',
        'Timbre vocal, formantes, mecanismo de fonação, identidade da fonte e técnica vocal não são inferidos por esta trilha.',
      ], { unit: 'Hz / seconds', method: '40 ms autocorrelation frames with 10 ms hop; periodicity threshold 0.6', evidence: ['audio_analysis.fundamental_frequency_track'], confidence: null });
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

    if (id === 'instrumental_sound_sources' && (hasValue(source.instrumentation) || hasValue(representation.instrumentation) || hasValue(source.vocal_presence) || hasValue(source.vocal_content))) {
      const instrumentation = source.instrumentation ?? representation.instrumentation ?? null;
      const vocalPresence = source.vocal_presence ?? source.vocal_content ?? null;
      dims[id] = record(id, { instrumentation, vocal_presence: vocalPresence }, 'observed', [
        'O valor deriva de metadados fornecidos pela fonte; sem análise vocal/instrumental validada, a ausência de dados vocais não significa que a faixa seja instrumental.',
        'Descritores espectrais isolados não identificam com segurança instrumentos ou fontes sonoras específicas.',
      ], { method: 'source instrumentation and vocal metadata', evidence: [
        ...(hasValue(instrumentation) ? ['source.instrumentation or representation.instrumentation'] : []),
        ...(hasValue(vocalPresence) ? ['source.vocal_presence or source.vocal_content'] : []),
      ], confidence: 0.6 });
      continue;
    }

    if (id === 'mechanical_voice_analysis') {
      const voice = source.voice_analysis ?? source.vocal_analysis ?? representation.voice_analysis ?? null;
      if (hasValue(voice)) {
        dims[id] = record(id, voice, 'observed', [
          'O resultado reflete análise ou anotação fornecida pela fonte; não significa que o motor tenha extraído automaticamente esses atributos do áudio.',
          'Classificação de tipo vocal, registro, formantes, mecanismo de fonação e técnica depende de áudio adequado, segmentação e método validado; metadados incompletos não autorizam completar campos por suposição.',
          'Efeitos, equalização, sobreposição de vozes e condições de gravação podem alterar os indícios acústicos e dificultar a atribuição de características fisiológicas ao cantor.',
        ], { method: 'source-provided voice analysis or annotation', evidence: [
          ...(hasValue(source.voice_analysis) ? ['source.voice_analysis'] : []),
          ...(hasValue(source.vocal_analysis) ? ['source.vocal_analysis'] : []),
          ...(hasValue(representation.voice_analysis) ? ['representation.voice_analysis'] : []),
        ], confidence: 0.6 });
        continue;
      }
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
