import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('performance-chaos verifies concurrency, resilience, and memory limits', () => {
  const res = spawnSync(process.execPath, ['./dist/scripts/performance-chaos.js'], {
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
  assert.ok(/PERFORMANCE CHAOS VALIDATION/.test(output))
  assert.ok(/Concurrent Validations:\s*5,000/.test(output))
  assert.ok(/Retry Storm:\s*SURVIVED/.test(output))
  assert.ok(/Registry Failure Recovery:\s*VERIFIED/.test(output))
  assert.ok(/Circuit Breakers:\s*STABLE/.test(output))
  assert.ok(/Peak Heap:/.test(output))
  assert.ok(/Event Loop Starvation:\s*NONE/.test(output))
})
