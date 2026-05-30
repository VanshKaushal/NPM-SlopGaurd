import { test } from 'node:test'
import assert from 'node:assert'
import { validatePackage } from '../src/core/validator.js'
import { decidePolicy } from '../src/mcp/decision-engine.js'

test('Offline mode score penalty verification', async (t) => {
  const result = await validatePackage('some-unknown-pkg@1.0.0', { offline: true })
  
  assert.ok(result.score <= 55, `Score should be <= 55 for unknown package in offline mode, got ${result.score}`)
  assert.ok(result.infos.some(w => w.offlineUnknown === true) || result.warnings.some(w => w.offlineUnknown === true) || result.raw.publisher_age?.offlineUnknown, 'Should have offline_unknown signals')

  const policyDecision = decidePolicy({
    pkg: 'some-unknown-pkg',
    result,
    policy: {
      minimumConfidence: 'low',
      maxRiskScore: 40,
      requireProvenance: true,
      blockNewPackages: false,
      blockHallucinatedPackages: false,
      allowInstallScripts: 'warn',
      maxDependencyDepth: 5,
      allowSubstringMatching: false
    },
    confidence: 'high',
    allowlisted: null,
    blocklisted: null,
    degraded: false
  })
  
  assert.strictEqual(policyDecision.action, 'block', 'Should block due to missing provenance in offline mode')
})
