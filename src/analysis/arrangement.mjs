export function analyzeArrangement(representation) {
  const sections = representation?.sections ?? [];
  const events = representation?.events ?? [];
  const instrumentation = representation?.instrumentation ?? {};

  const layers = Object.entries(instrumentation).map(([name, data]) => {
    const values = Array.isArray(data) ? data : [data];
    const starts = values
      .map(item => Number(item?.start))
      .filter(Number.isFinite);
    const ends = values
      .map(item => Number(item?.end))
      .filter(Number.isFinite);

    return {
      name,
      occurrences: values.length,
      start: starts.length ? Math.min(...starts) : null,
      end: ends.length ? Math.max(...ends) : null,
    };
  });

  const density = sections.map(section => {
    const start = Number(section.start);
    const end = Number(section.end);
    const count = events.filter(event => {
      const onset = Number(event.onset);
      return Number.isFinite(onset) && Number.isFinite(start) && Number.isFinite(end)
        && onset >= start && onset < end;
    }).length;

    return {
      id: section.id ?? null,
      event_count: count,
      duration: Number.isFinite(start) && Number.isFinite(end) ? end - start : null,
    };
  });

  return {
    layer_count: layers.length,
    layers,
    section_density: density,
    confidence: sections.length || layers.length ? 0.7 : 0,
    limitations: sections.length || layers.length
      ? []
      : ['No arrangement or section evidence was supplied.'],
  };
}
