function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  const left = a.map(String);
  const right = new Set(b.map(String));
  return left.filter(item => right.has(item)).length / Math.max(left.length, right.size);
}

export function segmentSections(representation, phrases = []) {
  if (!phrases.length) return [];

  const sections = [];
  for (let index = 0; index < phrases.length;) {
    const current = phrases[index];
    const next = phrases[index + 1];
    const currentSignature = current.signature ?? [];
    const repeatedIndex = phrases.findIndex((phrase, candidate) =>
      candidate > index && similarity(currentSignature, phrase.signature ?? []) >= 0.8,
    );

    if (repeatedIndex > index + 1) {
      const group = phrases.slice(index, repeatedIndex);
      sections.push({
        id: `section-${sections.length + 1}`,
        label: 'repeated-unit',
        start: group[0].start,
        end: group.at(-1).end,
        phrase_ids: group.map(phrase => phrase.id),
        repetition_of: null,
        confidence: 0.7,
      });
      index = repeatedIndex;
      continue;
    }

    sections.push({
      id: `section-${sections.length + 1}`,
      label: next ? 'unit' : 'terminal-unit',
      start: current.start,
      end: current.end,
      phrase_ids: [current.id],
      repetition_of: null,
      confidence: 0.55,
    });
    index += 1;
  }

  return sections;
}

export function findRepeatedSections(sections) {
  const result = [];
  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const a = sections[i].phrase_ids ?? [];
      const b = sections[j].phrase_ids ?? [];
      const score = similarity(a, b);
      if (score >= 0.8) result.push({ first: sections[i].id, second: sections[j].id, similarity: score });
    }
  }
  return result;
}
