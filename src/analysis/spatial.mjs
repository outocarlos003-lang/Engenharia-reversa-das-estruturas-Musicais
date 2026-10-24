function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function summarizeChannel(channel = {}) {
  const pan = finite(channel.pan);
  const width = finite(channel.width);
  const depth = finite(channel.depth);

  return {
    id: channel.id ?? null,
    name: channel.name ?? null,
    pan,
    width,
    depth,
    role: channel.role ?? null,
  };
}

export function analyzeSpatial(representation = {}) {
  const channels = representation?.spatial?.channels
    ?? representation?.spatial?.layers
    ?? representation?.instrumentation?.channels
    ?? [];

  if (!Array.isArray(channels) || channels.length === 0) {
    return {
      channels: [],
      panorama: null,
      width: null,
      depth: null,
      confidence: 0,
      limitations: ['No spatial channel data was supplied; spatial inference is unavailable.'],
    };
  }

  const normalized = channels.map(summarizeChannel);
  const pans = normalized.map(channel => channel.pan).filter(value => value !== null);
  const widths = normalized.map(channel => channel.width).filter(value => value !== null);
  const depths = normalized.map(channel => channel.depth).filter(value => value !== null);

  return {
    channels: normalized,
    panorama: pans.length ? { min: Math.min(...pans), max: Math.max(...pans), mean: pans.reduce((a, b) => a + b, 0) / pans.length } : null,
    width: widths.length ? { min: Math.min(...widths), max: Math.max(...widths), mean: widths.reduce((a, b) => a + b, 0) / widths.length } : null,
    depth: depths.length ? { min: Math.min(...depths), max: Math.max(...depths), mean: depths.reduce((a, b) => a + b, 0) / depths.length } : null,
    confidence: 0.7,
    limitations: ['Spatial measurements describe the supplied representation and do not by themselves establish perceptual depth or mixing intent.'],
  };
}
