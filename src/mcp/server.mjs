import readline from 'node:readline';
import { catalog } from './tools.mjs';
import { inspectWav } from '../adapters/wav.mjs';
import { evidence, OBSERVATION_TYPES } from '../core/model.mjs';

const definitions = catalog().map(tool => ({
  name: tool.name,
  description: `ERM musical investigation tool: ${tool.name}`,
  inputSchema: {
    type: 'object',
    properties: { target: { type: 'string' }, options: { type: 'object' } },
    required: ['target'],
  },
}));

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function error(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

async function callTool(name, target) {
  if (name === 'inspect_audio_artifact') {
    const artifact = await inspectWav(target);
    return {
      evidence: [
        evidence({ id: 'duration', claim: 'duration_seconds', value: artifact.duration, type: OBSERVATION_TYPES.MEASURED, confidence: 1 }),
        evidence({ id: 'sample-rate', claim: 'sample_rate_hz', value: artifact.format.sample_rate, type: OBSERVATION_TYPES.MEASURED, confidence: 1 }),
        evidence({ id: 'channels', claim: 'channel_count', value: artifact.format.channels, type: OBSERVATION_TYPES.MEASURED, confidence: 1 }),
      ],
      artifact,
      limitations: ['The built-in adapter currently supports RIFF/WAVE inspection.'],
    };
  }
  return {
    evidence: [],
    limitations: ['Tool contract is installed, but this DSP/music-analysis adapter is not implemented yet.'],
  };
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async line => {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); } catch { return error(null, -32700, 'Invalid JSON'); }

  if (request.method === 'initialize') {
    return reply(request.id, { protocolVersion: request.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'erm', version: '0.1.0' } });
  }
  if (request.method === 'notifications/initialized') return;
  if (request.method === 'tools/list') return reply(request.id, { tools: definitions });
  if (request.method === 'tools/call') {
    const name = request.params?.name;
    const tool = definitions.find(x => x.name === name);
    if (!tool) return error(request.id, -32602, `Unknown tool: ${name}`);
    const target = request.params?.arguments?.target;
    if (!target) return error(request.id, -32602, 'target is required');
    try {
      const result = await callTool(name, target);
      return reply(request.id, { content: [{ type: 'text', text: JSON.stringify({ tool: name, target, ...result }) }] });
    } catch (cause) {
      return error(request.id, -32000, cause.message);
    }
  }
  return error(request.id, -32601, `Method not found: ${request.method}`);
});
