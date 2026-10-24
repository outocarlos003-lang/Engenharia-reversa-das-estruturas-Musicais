export function analyzeRhythm(representation) {
  const events = representation?.events ?? [];
  const durations = events
    .map(event => Number(event.duration))
    .filter(Number.isFinite)
    .filter(duration => duration > 0);

  const accents = events
    .filter(event => event.accent !== undefined)
    .map(event => Number(event.accent))
    .filter(Number.isFinite);

  return {
    event_count: events.length,
    duration_profile: durations,
    accent_profile: accents,
    meter: representation?.timing?.meter ?? null,
    grid: representation?.timing?.grid ?? null,
    confidence: events.length ? 0.75 : 0,
    limitations: events.length
      ? []
      : ['No musical events were supplied; rhythmic inference is unavailable.'],
  };
}
