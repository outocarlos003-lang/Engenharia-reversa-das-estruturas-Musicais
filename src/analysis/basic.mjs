export function estimateTempoFromClicks(clickTimes) {
  if (!Array.isArray(clickTimes) || clickTimes.length < 2) return { bpm: null, confidence: 0 };
  const intervals = clickTimes.slice(1).map((time, i) => Number(time) - Number(clickTimes[i])).filter(value => Number.isFinite(value) && value > 0);
  if (!intervals.length) return { bpm: null, confidence: 0 };
  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  return { bpm: 60 / mean, confidence: 0.5 };
}
