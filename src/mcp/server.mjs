import readline from 'node:readline';
import { catalog } from './tools.mjs';

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
  return {
    tool: name,
    target,
    evidence: [],
    confidence: 0,
    limitations: [
      'O contrato da ferramenta está instalado, mas o analisador musical correspondente ainda não foi implementado.',
      'Metadados de contêiner e codec não são tratados como evidência composicional.',
    ],
  };
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async line => {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); } catch { return error(null, -32700, 'Invalid JSON'); }

  if (request.method === 'initialize') {
    return reply(request.id, {
      protocolVersion: request.params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'erm', version: '0.1.0' },
    });
  }
  if (request.method === 'notifications/initialized') return;
  if (request.method === 'tools/list') return reply(request.id, { tools: definitions });
  if (request.method === 'tools/call') {
    const name = request.params?.name;
    if (!definitions.some(tool => tool.name === name)) return error(request.id, -32602, `Unknown tool: ${name}`);
    const target = request.params?.arguments?.target;
    if (!target) return error(request.id, -32602, 'target is required');
    try {
      const result = await callTool(name, target);
      return reply(request.id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
    } catch (cause) {
      return error(request.id, -32000, cause.message);
    }
  }
  return error(request.id, -32601, `Method not found: ${request.method}`);
});
