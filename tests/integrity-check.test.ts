import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import crypto from 'node:crypto';

function sha256(data: Buffer | string) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'slopguard-integrity-fixture-'));
  const pkg = {
    name: 'slopguard-integrity-fixture',
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'node ./build.js' },
    files: ['dist'],
    exports: { '.': './dist/index.js' }
  };
  writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2));
  writeFileSync(join(root, 'build.js'), "import { mkdirSync, writeFileSync } from 'node:fs'\nimport { join } from 'node:path'\nmkdirSync('dist', { recursive: true })\nwriteFileSync(join('dist', 'index.js'), 'export const ok = true;\\n')\n");
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'index.js'), 'export const ok = true;\n');
  return root;
}

function packAndProvenance(fixture: string) {
  const output = execSync('npm pack --json', { cwd: fixture }).toString();
  const info = JSON.parse(output);
  const pack = Array.isArray(info) ? info[0] : info;
  const tarPath = join(fixture, pack.filename);
  const tarHash = sha256(readFileSync(tarPath));
  const provenance = {
    _type: 'https://in-toto.io/Statement/v0.1',
    subject: [{ name: pack.filename, digest: { sha256: tarHash } }],
    predicateType: 'https://slsa.dev/provenance/v1'
  };
  const provPath = join(fixture, 'provenance.json');
  
  const envelope = {
    payloadType: 'application/vnd.in-toto+json',
    payload: Buffer.from(JSON.stringify(provenance, null, 2)).toString('base64'),
    signatures: []
  };
  
  writeFileSync(provPath, JSON.stringify(envelope, null, 2));
  return { tarHash, provPath };
}

test('integrity-check passes with matching provenance', () => {
  const fixture = createFixture();
  const { provPath } = packAndProvenance(fixture);
  const res = spawnSync(process.execPath, ['./dist/scripts/integrity-check.js', '--workspace', fixture, '--provenance-file', provPath, '--require-provenance'], {
    cwd: process.cwd(),
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true' },
    encoding: 'utf8'
  });
  if (res.error) throw res.error;
  assert.equal(res.status, 0);
});

test('integrity-check fails when provenance missing', () => {
  const fixture = createFixture();
  const res = spawnSync(process.execPath, ['./dist/scripts/integrity-check.js', '--workspace', fixture, '--require-provenance'], {
    cwd: process.cwd(),
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true' },
    encoding: 'utf8'
  });
  if (res.error) throw res.error;
  assert.equal(res.status, 2);
});
