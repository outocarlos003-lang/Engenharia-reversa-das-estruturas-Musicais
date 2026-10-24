import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const blocked = [
  [119, 97, 118],
  [109, 101, 116, 97, 100, 97, 116, 97],
  [109, 101, 116, 97, 100, 97, 100, 111],
  [114, 105, 102, 102],
  [102, 108, 97, 99],
  [109, 112, 51],
  [115, 97, 109, 112, 108, 101, 95, 114, 97, 116, 101],
  [98, 105, 116, 95, 100, 101, 112, 116, 104],
  [116, 114, 97, 99, 107, 95, 112, 114, 111, 102, 105, 108, 101],
  [97, 117, 100, 105, 111, 95, 102, 101, 97, 116, 117, 114, 101, 115],
  [105, 110, 116, 101, 103, 114, 97, 116, 101, 100, 95, 108, 117, 102, 115],
  [100, 98, 102, 115],
  [108, 111, 117, 100, 110, 101, 115, 115],
  [99, 111, 100, 101, 99],
  [115, 97, 109, 112, 108, 101, 82, 97, 116, 101],
  [98, 105, 116, 115, 80, 101, 114, 83, 97, 109, 112, 108, 101],
  [102, 105, 108, 101, 95, 115, 105, 122, 101],
  [102, 105, 108, 101, 95, 102, 111, 114, 109, 97, 116],
  [102, 105, 108, 101, 95, 101, 120, 116, 101, 110, 115, 105, 111, 110],
  [109, 105, 109, 101, 95, 116, 121, 112, 101],
  [99, 111, 110, 116, 97, 105, 110, 101, 114],
  [102, 111, 114, 109, 97, 116],
  [97, 114, 116, 105, 102, 97, 99, 116],
  [101, 120, 116, 101, 110, 115, 105, 111, 110],
].map(codepoints => String.fromCharCode(...codepoints));

const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const violations = [];

for (const path of paths) {
  if (!/\.(mjs|cjs|js|json|md|ya?ml|toml|txt)$/i.test(path)) continue;
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const content = bytes.toString('utf8');
  for (const term of blocked) {
    const expression = new RegExp('(?:^|[^a-z0-9])' + term + '(?:$|[^a-z0-9])', 'i');
    if (expression.test(content)) {
      violations.push(path + ': prohibited domain term detected');
      break;
    }
  }
}

if (paths.some(path => path.startsWith('src/audio/'))) {
  violations.push('src/audio/: audio-ingestion modules are outside the compositional core');
}

if (violations.length) {
  process.stderr.write('Domain-boundary check failed:\n' + violations.join('\n') + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write('Domain-boundary check passed.\n');
}    const expression = new RegExp('(?:^|[^a-z0-9])' + term + '(?:$|[^a-z0-9])', 'i');
    if (expression.test(content)) {
      violations.push(path + ': prohibited domain term detected');
      break;
    }
  }
}

if (paths.some(path => path.startsWith('src/audio/'))) {
  violations.push('src/audio/: audio-ingestion modules are outside the compositional core');
}

if (violations.length) {
  process.stderr.write('Domain-boundary check failed:\n' + violations.join('\n') + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write('Domain-boundary check passed.\n');
}
