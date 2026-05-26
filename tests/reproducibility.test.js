import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'slopguard-fixture-'))
  const pkg = {
    name: 'slopguard-fixture',
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'node ./build.js' },
    files: ['dist']
  }
  writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2))
  writeFileSync(join(root, 'build.js'), "import { mkdirSync, writeFileSync } from 'node:fs'\nimport { join } from 'node:path'\nmkdirSync('dist', { recursive: true })\nwriteFileSync(join('dist', 'index.js'), 'export const ok = true;\\n')\n")
  mkdirSync(join(root, 'dist'), { recursive: true })
  return root
}

test('reproducibility-check passes on deterministic fixture', () => {
  const fixture = createFixture()
  const res = spawnSync(process.execPath, ['--loader', 'ts-node/esm', './scripts/reproducibility-check.ts', '--workspace', fixture], {
    cwd: process.cwd(),
    env: { ...process.env, SLOPGUARD_SKIP_INSTALL: '1' },
    encoding: 'utf8'
  })
  if (res.error) throw res.error
  if (res.status !== 0) {
    console.error(res.stdout)
    console.error(res.stderr)
  }
  assert.equal(res.status, 0)
})

test('reproducibility-check generates tarball', () => {
  const fixture = createFixture()
  const res = spawnSync(process.execPath, ['--loader', 'ts-node/esm', './scripts/reproducibility-check.ts', '--workspace', fixture], {
    cwd: process.cwd(),
    env: { ...process.env, SLOPGUARD_SKIP_INSTALL: '1' },
    encoding: 'utf8'
  })
  if (res.error) throw res.error
  assert.equal(res.status, 0)
  const output = `${res.stdout || ''}\n${res.stderr || ''}`
  assert.match(output, /\.tgz/i)
})
