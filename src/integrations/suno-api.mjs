const DEFAULT_MODEL = 'chirp-v3-5';

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function sectionLabel(section, index) {
  if (typeof section === 'string') return section;
  if (!section || typeof section !== 'object') return null;
  return firstDefined(section.label, section.name, section.title, section.type, section.section_type) ?? `section ${index + 1}`;
}

/**
 * Converts supplied ERM evidence into a Suno Custom Mode request.
 * It does not infer missing musical facts: unsupported fields are omitted.
 */
export function buildSunoGenerationRequest(report, options = {}) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('report must be an ERM analysis report object');
  }
  const representation = report.representation && typeof report.representation === 'object'
    ? report.representation
    : report;
  const tags = String(options.style ?? options.tags ?? '').trim();
  const title = String(options.title ?? 'ERM structural reconstruction').trim();
  if (!tags) throw new TypeError('options.style (or options.tags) is required for Suno Custom Mode');
  if (!title) throw new TypeError('options.title must not be empty');

  const constraints = [];
  const tempo = firstDefined(representation.tempo_bpm, representation.bpm, representation.tempo);
  if (Number.isFinite(Number(tempo)) && Number(tempo) > 0) constraints.push(`Tempo reference: ${Number(tempo)} BPM.`);
  const meter = firstDefined(representation.meter, representation.time_signature, representation.timeSignature);
  if (typeof meter === 'string' || typeof meter === 'number') constraints.push(`Meter reference: ${meter}.`);
  const key = firstDefined(representation.key, representation.tonal_center, representation.tonality);
  if (typeof key === 'string') constraints.push(`Tonal-center reference: ${key}.`);

  const sections = Array.isArray(representation.sections) ? representation.sections : [];
  const labels = sections.map(sectionLabel).filter(Boolean);
  if (labels.length) constraints.push(`Supplied section sequence: ${labels.join(' → ')}.`);

  const chords = firstDefined(representation.chord_progression, representation.harmony, representation.chords);
  if (Array.isArray(chords) && chords.length) {
    constraints.push(`Supplied harmonic material: ${chords.map(item =>
      typeof item === 'string' ? item : firstDefined(item?.symbol, item?.chord, item?.label)
    ).filter(Boolean).join(' – ')}.`);
  } else if (typeof chords === 'string' && chords.trim()) {
    constraints.push(`Supplied harmonic material: ${chords.trim()}.`);
  }

  const promptParts = [
    String(options.prompt ?? 'Compose a coherent original piece guided by the supplied structural references.').trim(),
    constraints.length ? `Structural references from ERM (treat as constraints only where explicitly supplied): ${constraints.join(' ')}` : '',
    'Do not claim exact reproduction of any reference recording. Preserve a clear form and intentional transitions; treat any absent musical properties as unspecified.',
    options.lyrics ? `Lyrics:\n${String(options.lyrics).trim()}` : '',
  ].filter(Boolean);

  return {
    prompt: promptParts.join('\n\n'),
    tags,
    title,
    make_instrumental: options.instrumental === true,
    wait_audio: options.waitAudio === true,
    model: String(options.model ?? DEFAULT_MODEL),
    ...(options.negativeTags ? { negative_tags: String(options.negativeTags) } : {}),
  };
}

/**
 * Minimal client for a self-hosted gcui-art/suno-api instance.
 * The Suno session cookie and CAPTCHA credentials belong on that server,
 * never in this project or in client-side code.
 */
export class SunoApiClient {
  constructor({ baseUrl = process.env.SUNO_API_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
    if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
      throw new TypeError('Set SUNO_API_BASE_URL to your self-hosted Suno API URL');
    }
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async request(path, { method = 'GET', body } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: body === undefined ? { accept: 'application/json' } : {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : null; }
      catch { data = raw; }
      if (!response.ok) {
        const detail = data && typeof data === 'object' ? data.error ?? data.message : data;
        throw new Error(`Suno API request failed (${response.status}): ${detail || response.statusText}`);
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  generate(report, options = {}) {
    const payload = buildSunoGenerationRequest(report, options);
    return this.request('/api/custom_generate', { method: 'POST', body: payload });
  }

  generateFromPrompt(prompt, { instrumental = false, waitAudio = false, model = DEFAULT_MODEL } = {}) {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new TypeError('prompt must be a non-empty string');
    return this.request('/api/generate', {
      method: 'POST',
      body: { prompt: prompt.trim(), make_instrumental: instrumental, wait_audio: waitAudio, model },
    });
  }

  generateLyrics(prompt) {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new TypeError('prompt must be a non-empty string');
    return this.request('/api/generate_lyrics', { method: 'POST', body: { prompt: prompt.trim() } });
  }

  getAudio(ids = []) {
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id.trim())) {
      throw new TypeError('ids must be an array of non-empty strings');
    }
    const query = ids.length ? `?ids=${encodeURIComponent(ids.join(','))}` : '';
    return this.request(`/api/get${query}`);
  }

  getQuota() {
    return this.request('/api/get_limit');
  }

  async waitForAudio(ids, { intervalMs = 3000, timeoutMs = 180000 } = {}) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== 'string' || !id.trim())) {
      throw new TypeError('ids must be a non-empty array of non-empty strings');
    }
    if (!Number.isFinite(intervalMs) || intervalMs < 0 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new TypeError('intervalMs must be non-negative and timeoutMs must be positive');
    }
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const result = await this.getAudio(ids);
      const records = Array.isArray(result) ? result
        : Array.isArray(result?.data) ? result.data
        : Array.isArray(result?.clips) ? result.clips
        : result && typeof result === 'object' ? [result] : [];
      const byId = new Map(records.map(record => [String(record.id ?? record.audio_id ?? ''), record]));
      const matched = ids.map(id => byId.get(id)).filter(Boolean);
      const failed = matched.find(record => /^(failed|error|cancelled|canceled)$/i.test(String(record.status ?? record.state ?? '')));
      if (failed) throw new Error(`Suno generation failed for ${failed.id ?? failed.audio_id}: ${failed.error_message ?? failed.error ?? failed.status}`);
      const ready = ids.every(id => {
        const record = byId.get(id);
        if (!record) return false;
        const status = String(record.status ?? record.state ?? '').toLowerCase();
        return Boolean(record.audio_url ?? record.audioUrl ?? record.stream_url) ||
          ['complete', 'completed', 'success', 'succeeded'].includes(status);
      });
      if (ready) return ids.map(id => byId.get(id));
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for Suno audio: ${ids.filter(id => !byId.has(id)).join(', ') || 'generation incomplete'}`);
      await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, Math.max(0, deadline - Date.now()))));
    }
  }

  extendAudio({ audioId, prompt = '', continueAt, title = '', tags = '', negativeTags = '', model = DEFAULT_MODEL } = {}) {
    if (typeof audioId !== 'string' || !audioId.trim()) throw new TypeError('audioId is required');
    return this.request('/api/extend_audio', {
      method: 'POST',
      body: {
        audio_id: audioId.trim(),
        prompt,
        ...(continueAt === undefined ? {} : { continue_at: String(continueAt) }),
        title,
        tags,
        negative_tags: negativeTags,
        model,
      },
    });
  }
}
