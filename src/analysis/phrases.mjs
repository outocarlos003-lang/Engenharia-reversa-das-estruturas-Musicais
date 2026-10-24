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
