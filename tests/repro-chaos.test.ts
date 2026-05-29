import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('repro-chaos ensures deterministic output despite environment changes', () => {
  const res = spawnSync(process.execPath, ['./dist/scripts/repro-chaos.js'], {
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
  assert.ok(/REPRODUCIBILITY IMMORTALITY/.test(output))
  assert.ok(/Timezone Drift: IMMUNE/.test(output))
  assert.ok(/Locale Tampering: IMMUNE/.test(output))
  assert.ok(/Filesystem Ordering: STABLE/.test(output))
  assert.ok(/Hash Stability: VERIFIED/.test(output))
  assert.ok(/Reproducibility Rate: 100%/.test(output))
})
