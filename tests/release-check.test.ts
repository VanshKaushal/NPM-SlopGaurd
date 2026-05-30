import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('release-check validates tag version deterministically', () => {
  const res = spawnSync(process.execPath, ['./dist/scripts/release-check.js', '--allow-dirty', '--skip-integrity'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      TS_NODE_FILES: 'true',
      TS_NODE_TRANSPILE_ONLY: 'true',
      GITHUB_REF: 'refs/tags/v0.1.0-alpha.1'
    }
  })
  if (res.error) throw res.error
  const output = `${res.stdout}\n${res.stderr}`
  if (res.status !== 0) console.error(output)
  assert.equal(res.status, 0)
  assert.ok(/Release checks passed/.test(output))
})
