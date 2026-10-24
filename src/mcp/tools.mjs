export const MUSIC_REVERSE_TOOLS = Object.freeze([
  'extract_musical_features',
  'detect_tempo_meter',
  'estimate_harmonic_center',
  'detect_musical_events',
  'segment_music',
  'find_repeated_sections',
  'analyze_motifs',
  'analyze_melodic_structure',
  'analyze_rhythmic_structure',
  'analyze_harmonic_structure',
  'analyze_instrument_layers',
  'analyze_dynamics',
  'analyze_spatial_structure',
  'classify_genre',
  'analyze_aesthetics',
  'build_reconstruction_spec',
  'compare_reconstructions',
  'explain_evidence',
]);

export function catalog() {
  return MUSIC_REVERSE_TOOLS.map(name => ({
    name,
    input: { target: 'musical-source-or-analysis-id' },
    output: { evidence: true, confidence: true, limitations: true },
  }));
}
