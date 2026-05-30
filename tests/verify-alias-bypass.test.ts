import { test } from 'node:test'
import assert from 'node:assert'
import { evaluatePolicy } from '../src/mcp/policy-engine.js'

test('npm:alias blocklist bypass verification', () => {
  const decision = evaluatePolicy({
    pkg: '@evil/malware',
    alias: 'safe-name',
    result: {
      pkg: '@evil/malware',
      version: '1.0.0',
      hardBlocked: false,
      warnings: [],
      infos: [],
      score: 100,
      raw: {}
    },
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
    allowlist: { allow: [] },
    blocklist: { block: ['@evil/malware'] },
    overrides: [],
    degraded: false
  })
  
  assert.strictEqual(decision.action, 'block', 'Decision should be BLOCK')
  assert.ok(decision.reasons.some(r => r.includes('@evil/malware')), 'Block reason must mention real name')
})
