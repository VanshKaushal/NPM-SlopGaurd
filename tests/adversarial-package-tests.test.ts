import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('adversarial-package-tests blocks adversarial vectors', () => {
  const res = spawnSync(process.execPath, ['./dist/scripts/adversarial-package-tests.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true' }
  })
  
  if (res.error) throw res.error
  const output = `${res.stdout}\n${res.stderr}`
  
  if (res.status !== 0) {
    console.error(output)
  }
  
  assert.equal(res.status, 0)
  assert.ok(/ADVERSARIAL PACKAGE AUDIT/.test(output))
  assert.ok(/Unicode Spoofing \(CVE-Evasion\): BLOCKED/.test(output))
  assert.ok(/Symlink Directory Escapes: BLOCKED/.test(output))
  assert.ok(/Tarball Compression Bombs: BLOCKED/.test(output))
  assert.ok(/Disguised Env Exfiltration: BLOCKED/.test(output))
  assert.ok(/Hidden Preinstall Hooks: BLOCKED/.test(output))
  assert.ok(/Audit Evasion Rate: 0\.00%/.test(output))
})
