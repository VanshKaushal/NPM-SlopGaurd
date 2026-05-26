import { computeConfidence } from '../core/confidence.js'
import { PolicyDecision } from '../core/decision.js'
import { PolicyConfig } from '../core/policy.js'
import { matchAllowlist } from '../core/allowlist.js'
import { matchBlocklist } from '../core/blocklist.js'
import { findOverrides, PolicyOverride } from '../core/overrides.js'
import { decidePolicy } from './decision-engine.js'
import { ValidationResult, GraphValidationResult } from '../types.js'

export type PolicyEngineInput = {
  pkg: string
  result: ValidationResult
  policy: PolicyConfig
  allowlist: { allow: string[] }
  blocklist: { block: string[] }
  overrides: PolicyOverride[]
  graph?: GraphValidationResult
  degraded?: boolean
}

function rankOverrideAction(action: PolicyOverride['action']) {
  if (action === 'block') return 3
  if (action === 'allow') return 2
  return 1
}

export function evaluatePolicy(input: PolicyEngineInput): PolicyDecision {
  const confidence = computeConfidence(input.result)
  const allowlisted = matchAllowlist(input.pkg, input.allowlist)
  const blocklisted = matchBlocklist(input.pkg, input.blocklist)

  const baseDecision = decidePolicy({
    pkg: input.pkg,
    result: input.result,
    policy: input.policy,
    confidence: confidence.level,
    allowlisted,
    blocklisted,
    graph: input.graph,
    degraded: Boolean(input.degraded)
  })

  const overrides = findOverrides(input.pkg, input.overrides)
  if (!overrides.length) {
    return {
      ...baseDecision,
      confidence: confidence.level,
      overridesApplied: []
    }
  }

  const sorted = [...overrides].sort((a, b) => rankOverrideAction(b.action) - rankOverrideAction(a.action))
  const applied = sorted[0]
  const reasons = [
    ...baseDecision.reasons,
    applied.reason ? `override: ${applied.reason}` : `override applied (${applied.action})`
  ]

  return {
    action: applied.action,
    confidence: confidence.level,
    reasons,
    overridesApplied: overrides.map(entry => `${entry.action}:${entry.name}`)
  }
}
