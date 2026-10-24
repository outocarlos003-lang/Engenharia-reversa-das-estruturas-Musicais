import { catalog } from './mcp/tools.mjs';

export function help() {
  return [
    'ERM — Engenharia reversa das estruturas Musicais',
    '',
    'Commands:',
    '  analyze <audio>             full evidence-first analysis',
    '  inspect <audio>             artifact/signal inspection',
    '  segment <audio>             structural segmentation',
    '  infer-genre <audio>         genre/subgenre inference',
    '  infer-aesthetics <audio>    aesthetic analysis',
    '  build-reconstruction <audio> reconstruction specification',
    '  compare <a> <b>             compare structural reports/audio analyses',
    '  mcp                         expose MCP server',
    '',
    `MCP tools: ${catalog().length}`,
  ].join('\n');
}

export async function run(argv = process.argv.slice(2)) {
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') return help();
  const [command] = argv;
  throw new Error(`Command '${command}' is declared but its analyzer adapter is not installed yet.`);
}
