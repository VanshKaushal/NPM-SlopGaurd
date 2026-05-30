import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('monorepo-validation detects chaos scenarios deterministically', () => {
  const res = spawnSync(process.execPath, ['./dist/scripts/monorepo-validation.js'], {
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
  assert.ok(/MONOREPO VALIDATION PASSED/.test(output))
})
