import { catalog } from './mcp/tools.mjs';
import { inspectWav } from './adapters/wav.mjs';
import { analysisReport, evidence, OBSERVATION_TYPES } from './core/model.mjs';
import { buildReconstructionSpec } from './analysis/reconstruction.mjs';

export function help() {
  return [
    'ERM — Engenharia reversa das estruturas Musicais',
    '',
    'Commands:',
    '  analyze <audio>              evidence-first artifact analysis',
    '  inspect <audio>              artifact/signal inspection',
    '  segment <audio>              structural segmentation',
    '  infer-genre <audio>          genre/subgenre inference',
    '  infer-aesthetics <audio>     aesthetic analysis',
    '  build-reconstruction <audio> reconstruction specification',
    '  compare <a> <b>              compare structural reports/audio analyses',
    '  mcp                          expose MCP server',
    '',
    `MCP tools: ${catalog().length}`,
  ].join('\n');
}

async function inspect(target) {
  const artifact = await inspectWav(target);
  return analysisReport({
    target,
    artifact,
    observations: [
      evidence({ id: 'duration', claim: 'duration_seconds', value: artifact.duration, type: OBSERVATION_TYPES.MEASURED, confidence: 1 }),
      evidence({ id: 'sample-rate', claim: 'sample_rate_hz', value: artifact.format.sample_rate, type: OBSERVATION_TYPES.MEASURED, confidence: 1 }),
      evidence({ id: 'channels', claim: 'channel_count', value: artifact.format.channels, type: OBSERVATION_TYPES.MEASURED, confidence: 1 }),
    ],
    limitations: ['Current built-in adapter reads PCM-compatible WAV headers; advanced DSP adapters are separate modules.'],
  });
}

export async function run(argv = process.argv.slice(2)) {
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') return help();
  const [command, ...args] = argv;
  if (!args[0] && command !== 'mcp') throw new Error(`Command '${command}' requires an audio target.`);

  if (command === 'inspect' || command === 'analyze') return JSON.stringify(await inspect(args[0]), null, 2);
  if (command === 'build-reconstruction') {
    const report = await inspect(args[0]);
    return JSON.stringify(buildReconstructionSpec(report), null, 2);
  }
  if (command === 'mcp') return null;
  throw new Error(`Command '${command}' is declared but its analyzer adapter is not installed yet.`);
}
