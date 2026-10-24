import { evidence, OBSERVATION_TYPES } from '../core/model.mjs';

export function analyzeHarmony(representation) {
  const chords = representation?.harmony?.chords ?? [];
  const key = representation?.harmony?.center ?? null;

  const transitions = [];
  for (let i = 1; i < chords.length; i += 1) {
    transitions.push({ from: chords[i - 1].symbol ?? chords[i - 1].root, to: chords[i].symbol ?? chords[i].root });
  }

  return {
    center: key,
    chords,
    transitions,
    evidence: [
      evidence({
        id: 'harmonic-center',
        claim: 'harmonic_center',
        value: key,
        type: key ? OBSERVATION_TYPES.INFERRED : OBSERVATION_TYPES.MEASURED,
        confidence: key ? 0.7 : 0,
        limitations: key ? [] : ['No harmonic center was supplied.'],
      }),
    ],
    limitations: chords.length ? [] : ['No chord sequence was supplied.'],
  };
}
