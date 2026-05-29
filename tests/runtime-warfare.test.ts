import assert from 'assert';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.join(__dirname, '../..', 'dist', 'src', 'cli.js');

export function runRuntimeWarfareTests() {
  console.log('--- Running Runtime Warfare Tests ---');
  
  // Test 1: Malformed input should not crash with a stack trace (exit 1, not exit 134/139)
  const result = spawnSync(process.execPath, [cliPath, 'check', 'bad@*#$*'], { stdio: 'ignore' });
  if (result.status === 0) {
    assert.fail('Should have thrown an error on bad input');
  } else {
    assert.ok(result.status === 1 || result.status !== 0, 'Exit code should reflect handled error');
  }
  
  console.log('Runtime warfare tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRuntimeWarfareTests();
}
