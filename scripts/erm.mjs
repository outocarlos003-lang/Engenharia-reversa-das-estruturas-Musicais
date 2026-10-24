#!/usr/bin/env node
import { run } from '../src/cli.mjs';

if (process.argv[2] === 'mcp') {
  await import('../src/mcp/server.mjs');
} else {
  try {
    const result = await run(process.argv.slice(2));
    if (result) console.log(result);
  } catch (error) {
    console.error(`ERM error: ${error.message}`);
    process.exitCode = 1;
  }
}
