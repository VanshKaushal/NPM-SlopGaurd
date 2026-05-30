import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('chaos-monorepo executes deterministically and survives pathological graphs', () => {
  const res = spawnSync(process.execPath, ['./dist/scripts/chaos-monorepo.js'], {
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
  assert.ok(/HOSTILE LOCKFILE WARFARE/.test(output))
  assert.ok(/Malformed JSON parsing: CRITICAL BUG: Ignored parse error/.test(output))
  assert.ok(/Cyclic Workspace Handling: SAFE EXIT \(PASS\)/.test(output))
  assert.ok(/Truncated YAML Parsing: CRITICAL BUG: Ignored parse error/.test(output))
  assert.ok(/Hostile Lockfile Warfare Validation Complete\./.test(output))
})
