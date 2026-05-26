import { ValidationResult, GraphValidationResult } from '../types.js'
import { PolicyDecision } from '../core/decision.js'
import { resolveEnforcement, EnforcementOutcome } from '../core/enforcement.js'
import { PolicyConfig } from '../core/policy.js'
import { PolicyOverride } from '../core/overrides.js'
import { evaluatePolicy } from './policy-engine.js'

export type EnforcementInput = {
  pkg: string
  result: ValidationResult
  policy: PolicyConfig
  allowlist: { allow: string[] }
  blocklist: { block: string[] }
  overrides: PolicyOverride[]
  graph?: GraphValidationResult
  ignoreWarnings: boolean
  nonInteractive: boolean
  dryRun: boolean
  degraded?: boolean
}

export type EnforcementResult = {
  decision: PolicyDecision
  enforcement: EnforcementOutcome
}

export function enforcePolicy(input: EnforcementInput): EnforcementResult {
  const decision = evaluatePolicy({
    pkg: input.pkg,
    result: input.result,
    policy: input.policy,
    allowlist: input.allowlist,
    blocklist: input.blocklist,
    overrides: input.overrides,
    graph: input.graph,
    degraded: input.degraded
  })

  const enforcement = resolveEnforcement(decision, {
    ignoreWarnings: input.ignoreWarnings,
    nonInteractive: input.nonInteractive,
    dryRun: input.dryRun
  })

  return { decision, enforcement }
}
