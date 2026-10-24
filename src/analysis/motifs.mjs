export function findMotifs(representation) {
  const events = representation?.events ?? [];
  const signatures = new Map();

  for (const event of events) {
    const signature = event.signature ?? event.pitch ?? event.type ?? null;
    if (signature === null) continue;
    const key = String(signature);
    const current = signatures.get(key) ?? [];
    current.push(event.id ?? current.length);
    signatures.set(key, current);
  }

  return [...signatures.entries()]
    .filter(([, occurrences]) => occurrences.length > 1)
    .map(([signature, occurrences], index) => ({
      id: `motif-${index + 1}`,
      signature,
      occurrences,
      recurrence: occurrences.length,
      confidence: 0.7,
    }));
}
