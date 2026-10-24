function sectionSignature(section) {
  if (section?.signature !== undefined) return String(section.signature);
  if (section?.label !== undefined) return String(section.label);
  if (section?.motifs?.length) return section.motifs.map(motif => motif.id ?? motif.signature ?? '?').join('|');
  return '?';
}

function assignFormLabels(sections) {
  const labels = new Map();
  let nextCode = 0;

  return sections.map((section, index) => {
    const signature = sectionSignature(section);
    if (!labels.has(signature)) labels.set(signature, String.fromCharCode(65 + nextCode++));

    return {
      ...section,
      index,
      form_label: labels.get(signature),
      signature,
    };
  });
}

export function inferForm(sections = []) {
  const normalized = assignFormLabels(sections);
  const sequence = normalized.map(section => section.form_label);
  const repeated = sequence.filter((label, index) => sequence.indexOf(label) !== index);

  let role = 'undetermined';
  if (sequence.length === 1) role = 'single-section';
  else if (sequence.length === 2 && sequence[0] !== sequence[1]) role = 'binary';
  else if (sequence.length === 3 && sequence[0] === sequence[2]) role = 'ternary';
  else if (sequence.length >= 4 && sequence[0] === sequence[sequence.length - 1]) role = 'returning-form';
  else if (repeated.length) role = 'recurrent';

  return {
    sequence,
    sections: normalized,
    pattern: sequence.join('-'),
    role,
    confidence: sections.length ? 0.7 : 0,
    evidence_basis: ['section signatures and recurrence'],
    limitations: sections.length
      ? ['Form labels are relational and do not establish semantic section roles by themselves.']
      : ['No sections were supplied; formal inference is unavailable.'],
  };
}

export function compareForm(reference, candidate) {
  const a = reference?.sequence ?? [];
  const b = candidate?.sequence ?? [];
  const length = Math.max(a.length, b.length);
  if (!length) return { similarity: null, aligned: [] };

  const aligned = Array.from({ length }, (_, index) => ({
    index,
    reference: a[index] ?? null,
    candidate: b[index] ?? null,
    match: a[index] !== undefined && a[index] === b[index],
  }));

  return {
    similarity: aligned.filter(item => item.match).length / length,
    aligned,
  };
}
