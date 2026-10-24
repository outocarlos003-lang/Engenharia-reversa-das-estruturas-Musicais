import { catalog } from './mcp/tools.mjs';
import { analyzeMusicalSource, runMusicalTool } from './analysis/analyzer.mjs';
import { buildReconstructionSpec } from './analysis/reconstruction.mjs';

export function help() {
 return ['ERM — Engenharia reversa das estruturas Musicais','','Commands:','  analyze <fonte.json>          análise musical baseada em evidências','  segment <fonte.json>          inspeção das seções declaradas','  infer-genre <fonte.json>      relatório de gênero sem rótulos inventados','  infer-aesthetics <fonte.json> análise estética fornecida pela fonte','  build-reconstruction <fonte.json> especificação de reconstrução','  compare <a.json> <b.json>     comparação estrutural','  mcp                           expõe servidor MCP','','Entrada JSON: events [{start,duration,pitch,...}], tempo, meter, sections e form.','Áudio bruto ainda não é decodificado nesta versão.',`MCP tools: ${catalog().length}`].join('\n');
}

export async function run(argv = process.argv.slice(2)) {
 if (!argv.length || argv[0] === '--help' || argv[0] === '-h') return help();
 const [command, ...args] = argv;
 if (command === 'mcp') return null;
 if (!args[0]) throw new Error(`Command '${command}' requires a musical source.`);
 if (command === 'analyze') return JSON.stringify(await analyzeMusicalSource(args[0]), null, 2);
 if (command === 'build-reconstruction') {
  const report = await analyzeMusicalSource(args[0]);
  return JSON.stringify(buildReconstructionSpec({...report.representation, source:report.target, unresolved:report.limitations}), null, 2);
 }
 if (command === 'compare') {
  if (!args[1]) throw new Error('compare requires two JSON sources.');
  return JSON.stringify(await runMusicalTool('compare_reconstructions', args[0], {other:args[1]}), null, 2);
 }
 const mapping = {'segment':'segment_music','infer-genre':'classify_genre','infer-aesthetics':'analyze_aesthetics'};
 if (mapping[command]) return JSON.stringify(await runMusicalTool(mapping[command], args[0]), null, 2);
 throw new Error(`Unknown command: ${command}. Use --help.`);
}
