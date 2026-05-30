import { test } from 'node:test'
import assert from 'node:assert'
import path from 'path'
import { verifyLockfileIntegrity } from '../src/core/integrity-verifier.js'
import { parseLockfile } from '../src/core/lockfiles.js'

test('Lockfile integrity verification', async () => {
  const lockfilePath = path.join(process.cwd(), 'tests', 'fixtures', 'poisoned-lockfile', 'package-lock.json')
  const graph = parseLockfile({ type: 'npm', path: lockfilePath, rootDir: path.dirname(lockfilePath) })
  
  if (!graph) throw new Error('Failed to parse lockfile')
  
  try {
    await verifyLockfileIntegrity(graph, 'npm')
    assert.fail('Should have thrown an error for lockfile integrity mismatch')
  } catch (err: any) {
    assert.match(err.message, /CRITICAL: Lockfile integrity mismatch|Lockfile resolved URL mismatch/)
  }
})
