export function analyzeDynamics(representation) {
  const events = representation?.events ?? [];
  const sections = representation?.sections ?? [];

  const values = events
    .map(event => Number(event.velocity ?? event.dynamic))
    .filter(Number.isFinite);

  const sectionProfiles = sections.map(section => {
    const start = Number(section.start);
    const end = Number(section.end);
    const sectionValues = events
      .filter(event => {
        const onset = Number(event.onset);
        return Number.isFinite(onset) && Number.isFinite(start) && Number.isFinite(end)
          && onset >= start && onset < end;
      })
      .map(event => Number(event.velocity ?? event.dynamic))
      .filter(Number.isFinite);

    const mean = sectionValues.length
      ? sectionValues.reduce((sum, value) => sum + value, 0) / sectionValues.length
      : null;

    return { id: section.id ?? null, mean, count: sectionValues.length };
  });

  return {
    global_mean: values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null,
    range: values.length ? [Math.min(...values), Math.max(...values)] : null,
    section_profiles: sectionProfiles,
    confidence: values.length ? 0.75 : 0,
    limitations: values.length
      ? []
      : ['No explicit dynamic or velocity evidence was supplied.'],
  };
}
