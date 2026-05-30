import { test } from 'node:test'
import assert from 'node:assert'
import { validatePackage } from '../src/core/validator.js'
import { decidePolicy } from '../src/mcp/decision-engine.js'

test('Circuit breaker fail-closed verification', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async () => {
    const err = new Error('ECONNREFUSED')
    ;(err as any).cause = { code: 'ECONNREFUSED' }
    throw err
  }

  try {
    for (let i = 0; i < 6; i++) {
      await validatePackage(`react${i}@18.2.0`)
    }
    const result = await validatePackage('react6@18.2.0')
    
    assert.ok(result.score <= 55, `Score should be <= 55 during open circuit, got ${result.score}`)
    
    const policyDecision = decidePolicy({
      pkg: 'react',
      result,
      policy: {
        minimumConfidence: 'low',
        maxRiskScore: 40,
        requireProvenance: false,
        blockNewPackages: false,
        blockHallucinatedPackages: false,
        allowInstallScripts: 'warn',
        maxDependencyDepth: 5,
        allowSubstringMatching: false
      },
      confidence: 'high',
      allowlisted: null,
      blocklisted: null,
      degraded: true
    })
    
    assert.notStrictEqual(policyDecision.action, 'allow', 'Decision should not be PASS/allow during open circuit')
    assert.ok(result.warnings.some(w => w.name === 'existence' && w.passed === false), 'Signals should contain degraded/penalized signal')
  } finally {
    global.fetch = originalFetch
  }
})
