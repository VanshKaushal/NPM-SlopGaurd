import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomFillSync } from 'node:crypto';

function createFixture({ includeSecret = false, includePem = false, includeMap = false, includeInvalidExport = false, largeFileSizeMb = 0 } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'slopguard-audit-fixture-'));
  const files = ['dist'];
  if (includeSecret) files.push('.env');
  if (includePem) files.push('secrets/key.pem');
  if (includeMap) files.push('dist/index.js.map');
  const pkg = {
    name: 'slopguard-audit-fixture',
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'node ./build.js' },
    files,
    exports: { '.': includeInvalidExport ? './dist/missing.js' : './dist/index.js' }
  };
  writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2));
  writeFileSync(join(root, 'build.js'), "import { mkdirSync, writeFileSync } from 'node:fs'\nimport { join } from 'node:path'\nmkdirSync('dist', { recursive: true })\nwriteFileSync(join('dist', 'index.js'), 'export const ok = true;\\n')\n");
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'index.js'), 'export const ok = true;\n');
  if (includeSecret) writeFileSync(join(root, '.env'), 'SECRET=1');
  if (includePem) {
    mkdirSync(join(root, 'secrets'), { recursive: true });
    writeFileSync(join(root, 'secrets', 'key.pem'), '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n');
  }
  if (includeMap) writeFileSync(join(root, 'dist', 'index.js.map'), '{"version":3}');
  if (largeFileSizeMb > 0) {
    const chunk = Buffer.alloc(1024 * 1024);
    const target = join(root, 'dist', 'large.bin');
    for (let i = 0; i < largeFileSizeMb; i += 1) {
      randomFillSync(chunk);
      writeFileSync(target, chunk, { flag: i === 0 ? 'w' : 'a' });
    }
  }
  return root;
}

test('package-audit passes on clean fixture', () => {
  const fixture = createFixture();
  const res = spawnSync(process.execPath, ['./dist/scripts/package-audit.js', '--workspace', fixture, '--max-size-mb', '5'], {
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
  const res = spawnSync(process.execPath, ['./dist/scripts/package-audit.js', '--workspace', fixture, '--max-size-mb', '5'], {
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

test('package-audit fails on blocked artifacts and export violations', () => {
  const fixture = createFixture({ includePem: true, includeMap: true, includeInvalidExport: true });
  const res = spawnSync(process.execPath, ['./dist/scripts/package-audit.js', '--workspace', fixture, '--max-size-mb', '5'], {
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

test('package-audit fails on oversized tarball', () => {
  const fixture = createFixture({ largeFileSizeMb: 6 });
  const res = spawnSync(process.execPath, ['./dist/scripts/package-audit.js', '--workspace', fixture, '--max-size-mb', '5'], {
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
