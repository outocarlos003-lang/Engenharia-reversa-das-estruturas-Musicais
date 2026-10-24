import readline from 'node:readline';
import { catalog } from './tools.mjs';
import { runMusicalTool } from '../analysis/analyzer.mjs';

const definitions = catalog().map(tool => ({ name: tool.name, description: `Evidence-first musical analysis: ${tool.name}. Input is a JSON musical representation or a path to one.`, inputSchema: { type: 'object', properties: { target: { type: 'string' }, options: { type: 'object', additionalProperties: true } }, required: ['target'] } }));
const reply = (id, result) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
const error = (id, code, message) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async line => {
 if (!line.trim()) return;
 let req; try { req = JSON.parse(line); } catch { return error(null, -32700, 'Invalid JSON'); }
 if (req.method === 'initialize') return reply(req.id, { protocolVersion: req.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'erm', version: '0.2.0' } });
 if (req.method === 'notifications/initialized') return;
 if (req.method === 'tools/list') return reply(req.id, { tools: definitions });
 if (req.method === 'tools/call') {
  const name = req.params?.name; const args = req.params?.arguments ?? {};
  if (!definitions.some(t => t.name === name)) return error(req.id, -32602, `Unknown tool: ${name}`);
  if (typeof args.target !== 'string' || !args.target.trim()) return error(req.id, -32602, 'target is required');
  try { const value = await runMusicalTool(name, args.target, args.options ?? {}); return reply(req.id, { content: [{ type: 'text', text: JSON.stringify(value) }] }); }
  catch (e) { return reply(req.id, { isError: true, content: [{ type: 'text', text: e.message }] }); }
 }
 return error(req.id, -32601, `Method not found: ${req.method}`);
});
