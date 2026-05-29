import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'slopguard-repro-fixture-'))
  const pkg = {
    name: 'slopguard-repro-fixture',
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'node ./build.js' },
    files: ['dist', 'attack.txt']
  }
  writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2))
  writeFileSync(join(root, 'build.js'), "import { mkdirSync, writeFileSync } from 'node:fs'\nimport { join } from 'node:path'\nmkdirSync('dist', { recursive: true })\nwriteFileSync(join('dist', 'index.js'), 'export const ok = true;\\n')\n")
  mkdirSync(join(root, 'dist'), { recursive: true })
  writeFileSync(join(root, 'dist', 'index.js'), 'export const ok = true;\n')
  writeFileSync(join(root, 'attack.txt'), 'stable\n')
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({
    name: 'slopguard-repro-fixture',
    lockfileVersion: 3,
    packages: { '': { name: 'slopguard-repro-fixture', version: '1.0.0' } }
  }, null, 2))
  return root
}

test('reproducibility check passes on stable fixture', () => {
  const fixture = createFixture()
  const res = spawnSync(process.execPath, ['./dist/scripts/reproducibility-check.js', '--workspace', fixture], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true', SLOPGUARD_SKIP_INSTALL: '1' }
  })
  if (res.error) throw res.error
  const output = `${res.stdout}\n${res.stderr}`
  if (res.status !== 0) console.error(output)
  assert.equal(res.status, 0)
  assert.ok(/REPRODUCIBILITY VERIFIED/.test(output))
})

test('reproducibility check detects lockfile drift', () => {
  const fixture = createFixture()
  const res = spawnSync(process.execPath, ['./dist/scripts/reproducibility-check.js', '--workspace', fixture, '--attack', 'lockfile'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true', SLOPGUARD_SKIP_INSTALL: '1' }
  })
  if (res.error) throw res.error
  const output = `${res.stdout}\n${res.stderr}`
  assert.equal(res.status, 2)
  assert.ok(/REPRODUCIBILITY FAILED/.test(output))
})
