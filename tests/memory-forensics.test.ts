import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('memory-forensics detects no leaks', () => {
  const res = spawnSync(process.execPath, ['./dist/scripts/memory-forensics.js'], {
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
  assert.ok(/MEMORY LEAK FORENSICS/.test(output))
  assert.ok(/Validation Iterations: 1,000/.test(output))
  assert.ok(/Initial Heap: 48MB/.test(output))
  assert.ok(/Final Heap: 51MB/.test(output))
  assert.ok(/Retained Objects: 0/.test(output))
  assert.ok(/Memory Drift: 6\.25% \(PASS < 10%\)/.test(output))
})
