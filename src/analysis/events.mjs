import { evidence, OBSERVATION_TYPES } from '../core/model.mjs';

export function detectMusicalEvents(representation) {
  const events = representation?.events ?? [];
  const ordered = [...events].sort((a, b) => Number(a.start ?? 0) - Number(b.start ?? 0));

  const onsets = ordered.map(event => Number(event.start ?? 0));
  const gaps = onsets.slice(1).map((value, index) => value - onsets[index]);

  return {
    events: ordered,
    onsets,
    interOnsetIntervals: gaps,
    evidence: [
      evidence({
        id: 'event-onsets',
        claim: 'musical_event_onsets',
        value: onsets,
        type: OBSERVATION_TYPES.MEASURED,
        confidence: 1,
        limitations: ['Events are assumed to already represent meaningful musical occurrences.'],
      }),
    ],
    limitations: [],
  };
}

/** Returns the ordered musical-event sequence used by the structural pipeline. */
export function detectEvents(representation) {
  return [...(representation?.events ?? [])].sort(
    (a, b) => Number(a.onset ?? a.start ?? 0) - Number(b.onset ?? b.start ?? 0),
  );
}
