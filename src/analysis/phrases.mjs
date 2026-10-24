function eventOnset(event, index) {
  const onset = Number(event.onset);
  return Number.isFinite(onset) ? onset : index;
}

function signature(event) {
  return event.signature ?? event.pitch ?? event.type ?? null;
}

export function detectPhrases(representation, options = {}) {
  const events = [...(representation?.events ?? [])].sort((a, b) => eventOnset(a, 0) - eventOnset(b, 0));
  if (!events.length) return [];

  const maxEvents = Number(options.maxEvents ?? 8);
  const phrases = [];

  for (let start = 0; start < events.length; start += maxEvents) {
    const chunk = events.slice(start, start + maxEvents);
    const first = chunk[0];
    const last = chunk.at(-1);
    phrases.push({
      id: `phrase-${phrases.length + 1}`,
      start: eventOnset(first, start),
      end: eventOnset(last, start + chunk.length - 1) + (Number(last.duration) || 0),
      event_ids: chunk.map((event, index) => event.id ?? `event-${start + index + 1}`),
      signature: chunk.map(signature).filter(value => value !== null),
      confidence: chunk.length >= 2 ? 0.65 : 0.4,
      limitations: ['Phrase boundaries are provisional until cadence, repetition, and sectional evidence are available.'],
    });
  }

  return phrases;
}

/** Infer phrase boundaries from supplied musical annotations and event relationships. */
export function inferPhrases(representation = {}) {
  const events = representation.events ?? [];
  if (!events.length) return [];
  const phrases = [];
  let current = [];
  const close = () => {
    if (!current.length) return;
    const first = current[0];
    const last = current.at(-1);
    phrases.push({
      id: `phrase-${phrases.length + 1}`,
      start: eventOnset(first, 0),
      end: eventOnset(last, current.length - 1) + (Number(last.duration) || 0),
      event_ids: current.map((event, index) => event.id ?? `event-${index + 1}`),
      signature: current.map(signature).filter(value => value !== null),
      confidence: current.length > 1 ? 0.65 : 0.4,
      limitations: ['Phrase boundaries remain hypotheses unless supported by explicit source markers or convergent musical evidence.'],
    });
    current = [];
  };
  const ordered = [...events].sort((a, b) => eventOnset(a, 0) - eventOnset(b, 0));
  for (let index = 0; index < ordered.length; index += 1) {
    const event = ordered[index];
    const previous = ordered[index - 1];
    const gap = previous
      ? eventOnset(event, index) - (eventOnset(previous, index - 1) + (Number(previous.duration) || 0))
      : 0;
    const explicit = Boolean(event.phrase_boundary_before || event.phrase_start || event.cadence_boundary_before ||
      previous?.phrase_end || previous?.cadence_boundary_after || previous?.boundary_after || previous?.is_phrase_end);
    const changedId = previous?.phrase_id != null && event.phrase_id != null && previous.phrase_id !== event.phrase_id;
    const splitForRest = previous && gap >= Math.max(0.75, (Number(previous.duration) || 0) * 1.5);
    if (current.length && (explicit || changedId || splitForRest)) close();
    current.push(event);
  }
  close();
  return phrases;
}
