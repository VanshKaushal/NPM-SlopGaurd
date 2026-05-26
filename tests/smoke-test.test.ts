import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('smoke-test script succeeds', () => {
  const res = spawnSync(process.execPath, ['--loader', 'ts-node/esm', './scripts/smoke-test.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TS_NODE_FILES: 'true',
      TS_NODE_TRANSPILE_ONLY: 'true',
      SLOPGUARD_SMOKE_USE_TS: '1',
      SLOPGUARD_SKIP_BUILD: '1'
    },
    encoding: 'utf8'
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
  }
  assert.equal(res.status, 0);
});
