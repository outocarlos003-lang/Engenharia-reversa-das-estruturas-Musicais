import readline from 'node:readline';
import { catalog } from './tools.mjs';
import { runMusicalTool } from '../analysis/analyzer.mjs';

const definitions = catalog().map(tool => ({
  name: tool.name,
  description: `Evidence-first musical analysis: ${tool.name}. Accepts a path to a JSON musical representation or an inline JSON object/event array. Audio-file decoding is not yet implemented.`,
  inputSchema: {
    type: 'object',
    properties: {
      target: { type: 'string', description: 'Path to a musical JSON file or inline JSON representation.' },
      options: { type: 'object', additionalProperties: true },
    },
    required: ['target'],
  },
}));

function reply(id, result) { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\\n`); }
function error(id, code, message) { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\\n`); }

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async line => {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); } catch { return error(null, -32700, 'Invalid JSON'); }
  if (request.method === 'initialize') return reply(request.id, {
    protocolVersion: request.params?.protocolVersion ?? '2025-06-18',
    capabilities: { tools: {} }, serverInfo: { name: 'erm', version: '0.2.0' },
  });
  if (request.method === 'notifications/initialized') return;
  if (request.method === 'tools/list') return reply(request.id, { tools: definitions });
  if (request.method === 'tools/call') {
    const { name } = request.params ?? {};
    const args = request.params?.arguments ?? {};
    if (!definitions.some(tool => tool.name === name)) return error(request.id, -32602, `Unknown tool: ${name}`);
    if (typeof args.target !== 'string' || !args.target.trim()) return error(request.id, -32602, 'target is required');
    try {
      const result = await runMusicalTool(name, args.target, args.options ?? {});
      return reply(request.id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
    } catch (cause) {
      return reply(request.id, { isError: true, content: [{ type: 'text', text: cause.message }] });
    }
  }
  return error(request.id, -32601, `Method not found: ${request.method}`);
});
