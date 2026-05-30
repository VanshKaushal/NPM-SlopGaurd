import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { mergePolicy } from '../src/core/policy.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', '..')  // dist/tests -> dist -> root
const configsDir = path.join(root, 'configs')

function loadPolicy(name: string) {
  const filePath = path.join(configsDir, `${name}.json`)
  const raw = fs.readFileSync(filePath, 'utf8')
  return mergePolicy(JSON.parse(raw))
}

test('enterprise-policy loads correctly', (t) => {
  const policy = loadPolicy('enterprise-policy')

  assert.strictEqual(policy.requireProvenance, true, 'enterprise: requireProvenance must be true')
  assert.strictEqual(policy.allowInstallScripts, 'block', 'enterprise: install scripts must be blocked')
  assert.ok(policy.maxRiskScore <= 30, `enterprise: maxRiskScore must be <= 30, got ${policy.maxRiskScore}`)
  assert.strictEqual(policy.allowMutableGitRefs, false, 'enterprise: mutable git refs must be blocked')
  assert.strictEqual(policy.requireLockfile, true, 'enterprise: lockfile must be required')
  assert.ok(Array.isArray(policy.allowedRegistries), 'enterprise: allowedRegistries must be an array')
  assert.ok(policy.allowedRegistries!.includes('https://registry.npmjs.org'), 'enterprise: must include npmjs.org')
  assert.strictEqual(policy.blockOnCircuitOpen, true, 'enterprise: must fail closed on circuit open')
  assert.ok((policy.minPublisherAgeDays ?? 0) >= 90, 'enterprise: minPublisherAgeDays must be >= 90')
  assert.ok((policy.minVersionAgeDays ?? 0) >= 7, 'enterprise: minVersionAgeDays must be >= 7')
})

test('fintech-policy loads correctly', (t) => {
  const policy = loadPolicy('fintech-policy')

  // Inherits enterprise-policy strictness
  assert.strictEqual(policy.requireProvenance, true, 'fintech: requireProvenance must be true')
  assert.strictEqual(policy.allowInstallScripts, 'block', 'fintech: install scripts must be blocked')
  assert.ok(policy.maxRiskScore <= 30, 'fintech: maxRiskScore must be <= 30')
  assert.strictEqual(policy.allowMutableGitRefs, false, 'fintech: mutable git refs must be blocked')
  assert.strictEqual(policy.requireLockfile, true, 'fintech: lockfile must be required')
  assert.strictEqual(policy.blockOnCircuitOpen, true, 'fintech: must fail closed on circuit open')

  // Fintech extras
  assert.strictEqual(policy.allowSubstringMatching, true, 'fintech: substring matching must be enabled')
  assert.strictEqual(policy.blockUnverifiedIntegrity, true, 'fintech: must block unverified integrity')
  assert.strictEqual(policy.requireSBOM, false, 'fintech: requireSBOM must be false (not yet implemented)')
  assert.ok(typeof policy.auditLogPath === 'string', 'fintech: auditLogPath must be a string')
  assert.ok(policy.auditLogPath!.includes('audit.log'), 'fintech: auditLogPath must point to audit.log')
})

test('ai-agent-policy loads correctly', (t) => {
  const policy = loadPolicy('ai-agent-policy')

  assert.strictEqual(policy.requireProvenance, false, 'ai-agent: requireProvenance should be false')
  assert.strictEqual(policy.allowInstallScripts, 'block', 'ai-agent: install scripts must be blocked')
  assert.ok(policy.maxRiskScore <= 50, `ai-agent: maxRiskScore must be <= 50, got ${policy.maxRiskScore}`)
  assert.strictEqual(policy.allowMutableGitRefs, false, 'ai-agent: mutable git refs must be blocked')
  assert.ok((policy.minPublisherAgeDays ?? 0) >= 7, 'ai-agent: minPublisherAgeDays must be >= 7')

  assert.ok(Array.isArray(policy.allowedScopes), 'ai-agent: allowedScopes must be an array')
  const scopes = policy.allowedScopes!
  assert.ok(scopes.includes('@anthropic'), 'ai-agent: must include @anthropic scope')
  assert.ok(scopes.includes('@openai'), 'ai-agent: must include @openai scope')
  assert.ok(scopes.includes('@huggingface'), 'ai-agent: must include @huggingface scope')
  assert.ok(scopes.includes('@langchain'), 'ai-agent: must include @langchain scope')
  assert.ok(scopes.includes('@llamaindex'), 'ai-agent: must include @llamaindex scope')
})

test('ci-lockdown-policy loads correctly', (t) => {
  const policy = loadPolicy('ci-lockdown-policy')

  assert.strictEqual(policy.frozenLockfile, true, 'ci-lockdown: frozenLockfile must be true')
  assert.strictEqual(policy.requireLockfile, true, 'ci-lockdown: requireLockfile must be true')
  assert.strictEqual(policy.allowInstallScripts, 'block', 'ci-lockdown: install scripts must be blocked')
  assert.strictEqual(policy.allowMutableGitRefs, false, 'ci-lockdown: mutable git refs must be blocked')
  assert.strictEqual(policy.blockOnCircuitOpen, true, 'ci-lockdown: must fail closed on circuit open')
  assert.strictEqual(policy.offlineMode, false, 'ci-lockdown: offlineMode must be false')
  assert.ok(policy.maxRiskScore <= 40, `ci-lockdown: maxRiskScore must be <= 40, got ${policy.maxRiskScore}`)
})

test('policy pack blocklist - enterprise blocks dangerous packages', (t) => {
  const policy = loadPolicy('enterprise-policy')
  
  // Verify install scripts are fully blocked
  assert.strictEqual(policy.allowInstallScripts, 'block',
    'enterprise policy must block packages with install scripts')
  
  // Verify new packages (under 90 days publisher age) are blocked
  assert.ok((policy.minPublisherAgeDays ?? 0) >= 90,
    'enterprise must block packages from publishers with < 90 day history')
})

test('policy pack - ai-agent allows known-safe AI packages by scope', (t) => {
  const policy = loadPolicy('ai-agent-policy')
  
  const scopes = policy.allowedScopes ?? []
  const knownSafeScopes = ['@openai', '@anthropic', '@huggingface', '@langchain', '@llamaindex']
  
  for (const scope of knownSafeScopes) {
    assert.ok(scopes.includes(scope), `ai-agent policy must allow scope ${scope}`)
  }
  
  // Verify it's more permissive on provenance (AI ecosystem often lacks it)
  assert.strictEqual(policy.requireProvenance, false,
    'ai-agent should not require provenance')
})

test('policy pack - ci-lockdown frozenLockfile is true', (t) => {
  const policy = loadPolicy('ci-lockdown-policy')
  
  assert.strictEqual(policy.frozenLockfile, true,
    'ci-lockdown must have frozenLockfile: true to prevent mutations')
})
