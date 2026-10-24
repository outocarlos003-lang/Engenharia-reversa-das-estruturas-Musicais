#!/usr/bin/env node
import { run, help } from '../src/cli.mjs';

try {
  const result = await run(process.argv.slice(2));
  if (result) console.log(result);
} catch (error) {
  console.error(`ERM error: ${error.message}`);
  process.exitCode = 1;
}
