import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function createFixture({ includeSecret = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'slopguard-audit-fixture-'));
  const pkg = {
    name: 'slopguard-audit-fixture',
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'node ./build.js' },
    files: includeSecret ? ['dist', '.env'] : ['dist'],
    exports: { '.': './dist/index.js' }
  };
  writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2));
  writeFileSync(join(root, 'build.js'), "import { mkdirSync, writeFileSync } from 'node:fs'\nimport { join } from 'node:path'\nmkdirSync('dist', { recursive: true })\nwriteFileSync(join('dist', 'index.js'), 'export const ok = true;\\n')\n");
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'index.js'), 'export const ok = true;\n');
  if (includeSecret) writeFileSync(join(root, '.env'), 'SECRET=1');
  return root;
}

test('package-audit passes on clean fixture', () => {
  const fixture = createFixture();
  const res = spawnSync(process.execPath, ['--loader', 'ts-node/esm', './scripts/package-audit.ts', '--workspace', fixture, '--max-size-mb', '5'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true' }
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
  }
  assert.equal(res.status, 0);
});

test('package-audit fails on secrets', () => {
  const fixture = createFixture({ includeSecret: true });
  const res = spawnSync(process.execPath, ['--loader', 'ts-node/esm', './scripts/package-audit.ts', '--workspace', fixture, '--max-size-mb', '5'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true' }
  });
  if (res.error) throw res.error;
  if (res.status !== 2) {
    console.error(res.stdout);
    console.error(res.stderr);
  }
  assert.equal(res.status, 2);
});
