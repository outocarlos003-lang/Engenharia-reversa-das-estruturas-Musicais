import { catalog } from './mcp/tools.mjs';
import { analysisReport } from './core/model.mjs';
import { buildReconstructionSpec } from './analysis/reconstruction.mjs';

export function help() {
  return [
    'ERM — Engenharia reversa das estruturas Musicais',
    '',
    'Commands:',
    '  analyze <fonte>               análise musical evidence-first',
    '  segment <fonte>               segmentação estrutural',
    '  infer-genre <fonte>           inferência de gênero/subgênero',
    '  infer-aesthetics <fonte>      análise estética',
    '  build-reconstruction <fonte>  especificação de reconstrução',
    '  compare <a> <b>               comparação estrutural',
    '  mcp                            expõe servidor MCP',
    '',
    `MCP tools: ${catalog().length}`,
  ].join('\n');
}

export function emptyAnalysis(target) {
  return analysisReport({
    target,
    limitations: [
      'A fonte ainda não foi convertida para uma representação musical estruturada.',
      'O ERM não trata contêineres, codecs ou metadados técnicos como elementos composicionais.',
    ],
  });
}

export async function run(argv = process.argv.slice(2)) {
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') return help();
  const [command, ...args] = argv;
  if (!args[0] && command !== 'mcp') throw new Error(`Command '${command}' requires a musical source.`);

  if (command === 'analyze') return JSON.stringify(emptyAnalysis(args[0]), null, 2);
  if (command === 'build-reconstruction') {
    return JSON.stringify(buildReconstructionSpec(emptyAnalysis(args[0])), null, 2);
  }
  if (command === 'mcp') return null;
  throw new Error(`Command '${command}' is declared but its musical analyzer adapter is not installed yet.`);
}
