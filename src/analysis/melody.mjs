import { evidence, OBSERVATION_TYPES } from '../core/model.mjs';

export function analyzeMelody(representation) {
  const notes = representation?.melody?.notes ?? [];
  if (!notes.length) {
    return {
      contour: [],
      intervals: [],
      range: null,
      evidence: [],
      limitations: ['No melodic notes were supplied.'],
    };
  }

  const intervals = [];
  for (let i = 1; i < notes.length; i += 1) {
    intervals.push(Number(notes[i].pitch) - Number(notes[i - 1].pitch));
  }

  const contour = intervals.map(value => value > 0 ? 'up' : value < 0 ? 'down' : 'same');
  const pitches = notes.map(note => Number(note.pitch)).filter(Number.isFinite);
  const range = pitches.length ? { min: Math.min(...pitches), max: Math.max(...pitches), semitones: Math.max(...pitches) - Math.min(...pitches) } : null;

  return {
    contour,
    intervals,
    range,
    evidence: [
      evidence({
        id: 'melodic-contour',
        claim: 'melodic_contour',
        value: contour,
        type: OBSERVATION_TYPES.MEASURED,
        confidence: 1,
        limitations: ['Contour depends on the supplied pitch sequence.'],
      }),
    ],
    limitations: [],
  };
}
