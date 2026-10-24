export const MUSIC_REVERSE_TOOLS = Object.freeze([
  'inspect_audio_artifact',
  'extract_audio_features',
  'detect_tempo_meter',
  'estimate_harmonic_center',
  'detect_events',
  'segment_music',
  'find_repeated_sections',
  'analyze_motifs',
  'analyze_instrument_layers',
  'analyze_dynamics',
  'analyze_stereo',
  'classify_genre',
  'analyze_aesthetics',
  'build_reconstruction_spec',
  'compare_reconstructions',
  'explain_evidence',
]);

export function catalog() {
  return MUSIC_REVERSE_TOOLS.map(name => ({
    name,
    input: { target: 'audio-path-or-analysis-id' },
    output: { evidence: true, confidence: true, limitations: true },
  }));
}
