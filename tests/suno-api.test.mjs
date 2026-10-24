import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSunoGenerationRequest, SunoApiClient } from '../src/integrations/suno-api.mjs';

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
