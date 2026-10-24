/**
 * Evidence-aware descriptive profile for a musical track.
 * Labels are reported as source annotations; missing audio measurements stay unresolved.
 */
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const list = value => value == null ? [] : Array.isArray(value) ? value : [value];

export function buildTrackProfile(source = {}, computed = {}) {
  const metadata = object(source.metadata);
  const annotations = object(source.annotations);
  const suppliedFeatures = object(source.audio_features);
  const profile = object(source.track_profile);
  const production = first(profile.production, source.production, metadata.production, annotations.production);
  const emotionalTone = first(profile.emotional_tone, source.emotional_tone, source.mood, annotations.emotional_tone);
  const thematicContent = first(profile.thematic_content, source.thematic_content, source.themes, annotations.thematic_content);
  const culturalContext = first(profile.cultural_context, source.cultural_context, source.culture, annotations.cultural_context);
  const primaryGenres = list(first(profile.genres?.primary, source.genres?.primary, source.primary_genres, source.genre));
  const secondaryGenres = list(first(profile.genres?.secondary, source.genres?.secondary, source.secondary_genres));
  const suppliedTempo = first(suppliedFeatures.tempo, source.tempo?.bpm, typeof source.tempo === 'number' ? source.tempo : undefined);
  const tempo = first(suppliedTempo, computed.tempo);
  const key = first(suppliedFeatures.key, source.key, source.tonal_center, source.harmony?.key);
  const loudness = first(suppliedFeatures.loudness, source.loudness, source.dynamics?.loudness, source.dynamics?.loudness_dbfs);
  const energyStructure = first(suppliedFeatures.energy_structure, source.energy_structure, source.dynamics?.energy_structure, source.dynamics?.energy_curve);
  const spectrum = first(suppliedFeatures.spectrum, source.spectrum, source.spectral_profile);
  const stereo = first(suppliedFeatures.stereo, source.stereo, source.spatial?.stereo, source.spatial);
  const available = (value, origin) => ({
    status: value === undefined ? 'unavailable' : 'source_supplied',
    value: value === undefined ? null : value,
    provenance: value === undefined ? [] : [origin],
  });
  return {
    emotional_tone: available(emotionalTone, 'source annotation'),
    production: available(production, 'source annotation'),
    thematic_content: available(thematicContent, 'source annotation'),
    cultural_context: available(culturalContext, 'source annotation'),
    genres: {
      primary: {status:primaryGenres.length?'source_supplied':'unavailable',value:primaryGenres,provenance:primaryGenres.length?['source annotation']:[]},
      secondary: {status:secondaryGenres.length?'source_supplied':'unavailable',value:secondaryGenres,provenance:secondaryGenres.length?['source annotation']:[]},
    },
    tempo: {
      status: tempo == null ? 'unavailable' : (suppliedTempo !== undefined ? 'source_supplied' : 'computed_from_event_timing'),
      value: tempo ?? null,
      provenance: tempo == null ? [] : [suppliedTempo !== undefined ? 'source tempo/audio features' : 'event onsets'],
    },
    key: available(key, 'source key/tonal-center annotation'),
    loudness: available(loudness, 'source audio feature'),
    energy_structure: available(energyStructure, 'source dynamics/audio feature'),
    spectrum: available(spectrum, 'source spectral feature'),
    stereo: {status:stereo == null ? 'unavailable' : stereo.status === 'measured' ? 'computed_from_audio' : 'source_supplied',value:stereo ?? null,provenance:stereo == null ? [] : [stereo.status === 'measured' ? 'WAV channel measurements' : 'source spatial/audio feature']},
    epistemic_note: 'Mood, production, themes, culture and genre are reported as annotations, not inferred facts. WAV loudness and spectrum are computed from decoded samples; stereo metrics are computed when at least two channels are present. Other measurements remain unavailable unless a compatible source measurement is supplied.',
  };
}
