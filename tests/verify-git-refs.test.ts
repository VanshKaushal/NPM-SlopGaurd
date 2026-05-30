import { test } from 'node:test'
import assert from 'node:assert'
import { validateDependencyGraph } from '../src/core/graph.js'
import { DependencyNode } from '../src/types.js'
import * as validator from '../src/core/validator.js'
import * as lockfiles from '../src/core/lockfiles.js'

import fs from 'fs'
import path from 'path'

test('Git mutable reference block verification', async (t) => {
  const fixtureDir = path.join(process.cwd(), 'tests', 'fixtures', 'git-refs')
  fs.mkdirSync(fixtureDir, { recursive: true })
  fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({
    dependencies: {
      testA: "github:user/repo#main",
      testB: "github:user/repo",
      testC: "github:user/repo#a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      testD: "1.0.0"
    }
  }))

  const result = await validateDependencyGraph({ cwd: fixtureDir, recursive: false, verifyIntegrity: false, offline: true })
  
  const testA = result.results.find(r => r.pkg === 'testA')!
  const testB = result.results.find(r => r.pkg === 'testB')!
  const testC = result.results.find(r => r.pkg === 'testC')!
  const testD = result.results.find(r => r.pkg === 'testD')!
  
  // Test A — Mutable branch ref
  assert.strictEqual(testA.hardBlocked, true, 'Test A should be hard blocked')
  assert.ok(testA.raw.git_mutability?.hardFail, 'Test A git_mutability signal should have hardFail: true')
  
  // Test B — Mutable (no ref at all)
  assert.strictEqual(testB.hardBlocked, true, 'Test B should be hard blocked')
  
  // Test C — Immutable SHA ref
  assert.notStrictEqual(testC.hardBlocked, true, 'Test C should not be hard blocked')
  assert.strictEqual(testC.score, 50, 'Test C score should be 50')
  assert.ok(testC.warnings.some(w => w.name === 'git_mutability'), 'Test C should have git_mutability warning')
  
  // Test D — Non-git package (control)
  assert.ok(!testD.raw.git_mutability, 'Test D should not have git_mutability signal')
})
