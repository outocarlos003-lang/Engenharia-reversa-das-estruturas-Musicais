import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSunoGenerationRequest, SunoApiClient } from '../src/integrations/suno-api.mjs';
import { runSunoReconstructionWorkflow } from '../src/integrations/suno-workflow.mjs';
import { analyzeWavBuffer, createWavAudioAnalyzer, decodeWavPcm, fetchAndAnalyzeWav } from '../src/integrations/audio-wav.mjs';

function makePcm16Wav({ sampleRate = 8000, samples = [0, 16384, -16384, 32767, -32768] } = {}) {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const ascii = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, dataBytes, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, sample, true));
  return buffer;
}

test('decodes PCM16 WAV into normalized samples and analyzes acoustic properties', () => {
  const wav = makePcm16Wav();
  const decoded = decodeWavPcm(wav);
  assert.equal(decoded.sampleRate, 8000);
  assert.equal(decoded.channels, 1);
  assert.equal(decoded.bitsPerSample, 16);
  assert.equal(decoded.frameCount, 5);
  assert.ok(Math.abs(decoded.samples[1] - 0.5) < 0.0001);
  assert.equal(decoded.samples[4], -1);
  const result = analyzeWavBuffer(wav);
  assert.equal(result.audio_metadata.container, 'RIFF/WAVE');
  assert.equal(result.analysis.sample_rate_hz, 8000);
  assert.equal(result.analysis.sample_count_per_channel, 5);
});

test('fetches and analyzes direct HTTPS WAV with size and host restrictions', async () => {
  const wav = makePcm16Wav();
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://audio.example/clip.wav');
    assert.equal(options.redirect, 'error');
    return { ok: true, status: 200, headers: { get: () => String(wav.byteLength) }, arrayBuffer: async () => wav };
  };
  const result = await fetchAndAnalyzeWav('https://audio.example/clip.wav', { fetchImpl, allowedHosts: ['audio.example'] });
  assert.equal(result.audio_metadata.duration_seconds, 5 / 8000);
  const adapter = createWavAudioAnalyzer({ fetchImpl, allowedHosts: ['audio.example'] });
  const adapted = await adapter({ audioUrl: 'https://audio.example/clip.wav' });
  assert.equal(adapted.analysis.sample_rate_hz, 8000);
  await assert.rejects(fetchAndAnalyzeWav('http://audio.example/clip.wav', { fetchImpl }), /requires HTTPS/);
  await assert.rejects(fetchAndAnalyzeWav('https://audio.example/clip.wav', { fetchImpl, allowedHosts: ['other.example'] }), /allowedHosts/);
});

test('rejects malformed WAV and oversized input', () => {
  assert.throws(() => decodeWavPcm(new Uint8Array(20)), /too short/);
  assert.throws(() => decodeWavPcm(makePcm16Wav(), { maxBytes: 44 }), /exceeds maximum/);
});



test('orchestrates generation, audio analysis, and optional comparison without claiming equivalence', async () => {
  const calls = [];
  const client = {
    async generate(report, options) {
      calls.push(['generate', report, options]);
      return [{ id: 'track-1', status: 'submitted' }];
    },
    async waitForAudio(ids, polling) {
      calls.push(['wait', ids, polling]);
      return [{ id: 'track-1', status: 'complete', audio_url: 'https://example.invalid/track.mp3' }];
    },
  };
  const reference = { representation: { tempo_bpm: 100 } };
  const result = await runSunoReconstructionWorkflow({
    client,
    report: reference,
    options: { style: 'ambient' },
    polling: { intervalMs: 0, timeoutMs: 500 },
    analyzeGeneratedAudio: async ({ track, audioUrl }) => ({ trackId: track.id, url: audioUrl, tempoCandidate: 98 }),
    compareReports: async ({ referenceReport, generatedAnalyses }) => ({
      referenceTempo: referenceReport.representation.tempo_bpm,
      generatedTempo: generatedAnalyses[0].analysis.tempoCandidate,
    }),
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.generated_analyses[0].analysis.tempoCandidate, 98);
  assert.deepEqual(result.comparison, { referenceTempo: 100, generatedTempo: 98 });
  assert.equal(calls[1][0], 'wait');
  assert.match(result.limitations[0], /não garantem conformidade exata/);
});

test('requires an explicit audio-analysis adapter and handles unrecognized generation IDs', async () => {
  const client = { async generate() { return { status: 'queued' }; } };
  await assert.rejects(runSunoReconstructionWorkflow({ client, report: {} }), /callback is required/);
  const result = await runSunoReconstructionWorkflow({
    client, report: {}, analyzeGeneratedAudio: async () => ({}),
  });
  assert.equal(result.status, 'generation_submitted_without_recognized_ids');
  assert.equal(result.comparison, null);
});

test('builds a Suno Custom Mode request from only supplied ERM structural evidence', () => {
  const payload = buildSunoGenerationRequest({
    representation: {
      tempo_bpm: 96,
      meter: '4/4',
      sections: [{ label: 'intro' }, { label: 'verse' }, { label: 'chorus' }],
      chord_progression: ['Am', 'F', 'C', 'G'],
    },
  }, { title: 'Study', style: 'indie pop, warm', instrumental: true, negativeTags: 'hard techno' });
  assert.equal(payload.title, 'Study');
  assert.equal(payload.tags, 'indie pop, warm');
  assert.equal(payload.make_instrumental, true);
  assert.match(payload.prompt, /96 BPM/);
  assert.match(payload.prompt, /intro → verse → chorus/);
  assert.match(payload.prompt, /Am – F – C – G/);
  assert.equal(payload.negative_tags, 'hard techno');
  assert.equal(payload.wait_audio, false);
  assert.throws(() => buildSunoGenerationRequest({}, {}), /style/);
});

test('Suno client sends custom generation and quota requests to configured self-hosted API', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify(url.endsWith('/api/get_limit')
        ? { credits_left: 10 }
        : [{ id: 'clip-1', status: 'submitted' }]),
    };
  };
  const client = new SunoApiClient({ baseUrl: 'http://localhost:3000/', fetchImpl });
  const generated = await client.generate({ representation: { tempo_bpm: 120 } }, { style: 'ambient', title: 'Study' });
  assert.equal(generated[0].id, 'clip-1');
  assert.equal(calls[0].url, 'http://localhost:3000/api/custom_generate');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.tags, 'ambient');
  assert.match(body.prompt, /120 BPM/);
  assert.deepEqual(await client.getQuota(), { credits_left: 10 });
  assert.equal(calls[1].url, 'http://localhost:3000/api/get_limit');
});

test('waits for generated audio and reports terminal failures', async () => {
  let calls = 0;
  const client = new SunoApiClient({
    baseUrl: 'http://localhost:3000',
    fetchImpl: async () => {
      calls += 1;
      const payload = calls === 1
        ? [{ id: 'clip-1', status: 'streaming' }]
        : [{ id: 'clip-1', status: 'complete', audio_url: 'https://example.invalid/audio.mp3' }];
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(payload) };
    },
  });
  const result = await client.waitForAudio(['clip-1'], { intervalMs: 0, timeoutMs: 1000 });
  assert.equal(calls, 2);
  assert.equal(result[0].audio_url, 'https://example.invalid/audio.mp3');

  const failedClient = new SunoApiClient({
    baseUrl: 'http://localhost:3000',
    fetchImpl: async () => ({
      ok: true, status: 200, statusText: 'OK',
      text: async () => JSON.stringify([{ id: 'clip-x', status: 'failed', error_message: 'generation rejected' }]),
    }),
  });
  await assert.rejects(failedClient.waitForAudio(['clip-x'], { intervalMs: 0, timeoutMs: 1000 }), /generation failed/);
});

test('Suno client validates input and surfaces HTTP errors', async () => {
  assert.throws(() => new SunoApiClient({ baseUrl: '' }), /SUNO_API_BASE_URL/);
  const client = new SunoApiClient({
    baseUrl: 'http://localhost:3000',
    fetchImpl: async () => ({ ok: false, status: 402, statusText: 'Payment Required', text: async () => '{"error":"quota exceeded"}' }),
  });
  await assert.rejects(client.getQuota(), /402.*quota exceeded/);
  await assert.rejects(client.generateFromPrompt('  '), /non-empty string/);
  await assert.rejects(client.getAudio(['']), /non-empty strings/);
});
