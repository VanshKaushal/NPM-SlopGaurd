import { PolicyDecision } from '../core/decision.js'
import { PolicyConfig } from '../core/policy.js'
import { ValidationResult, GraphValidationResult } from '../types.js'
import { ConfidenceLevel } from '../core/confidence.js'
import { isConfidenceAtLeast } from '../core/decision.js'

export type DecisionInput = {
  pkg: string
  result: ValidationResult
  policy: PolicyConfig
  confidence: ConfidenceLevel
  allowlisted: string | null
  blocklisted: string | null
  graph?: GraphValidationResult
  degraded: boolean
}

function isNewPackage(result: ValidationResult) {
  const versionSig = result.raw.version_age
  const publisherSig = result.raw.publisher_age
  if (!versionSig || !publisherSig) return false
  return !versionSig.passed && !publisherSig.passed
}

function hasMissingProvenance(result: ValidationResult) {
  const sig = result.raw.provenance
  if (!sig) return false
  if (sig.passed) return false
  if (sig.offlineUnknown) return true
  if (sig.message?.includes('unknown') || sig.message?.includes('offline-skip')) return false
  return true
}

function isHallucinated(result: ValidationResult) {
  const sig = result.raw.existence
  return Boolean(sig && !sig.passed && sig.hardFail)
}

export function decidePolicy(input: DecisionInput): PolicyDecision {
  const reasons: string[] = []

  if (input.blocklisted) {
    reasons.push(`blocklisted (${input.blocklisted})`)
    return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (input.allowlisted) {
    reasons.push(`allowlisted (${input.allowlisted})`)
    return { action: 'allow', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (input.result.hardBlocked) {
    reasons.push('hard block signal triggered')
    return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (input.policy.blockHallucinatedPackages && isHallucinated(input.result)) {
    reasons.push('hallucinated package blocked')
    return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (input.policy.requireProvenance && hasMissingProvenance(input.result)) {
    reasons.push('missing provenance attestation')
    return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (input.policy.blockNewPackages && isNewPackage(input.result)) {
    reasons.push('package flagged as newly created')
    return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (input.graph) {
    if (input.graph.blocked > 0) {
      reasons.push(`workspace graph has ${input.graph.blocked} blocked packages`)
      return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
    }
    if (input.graph.warnings > 0 && input.policy.allowInstallScripts !== 'allow') {
      reasons.push(`workspace graph has ${input.graph.warnings} warnings`)
      return { action: 'warn', confidence: input.confidence, reasons, overridesApplied: [] }
    }
    if (input.graph.dependencyDepth > input.policy.maxDependencyDepth) {
      reasons.push(`dependency depth ${input.graph.dependencyDepth} exceeds ${input.policy.maxDependencyDepth}`)
      return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
    }
    if (input.policy.allowInstallScripts === 'block' && input.graph.scriptWarnings?.length) {
      reasons.push('install scripts blocked by policy')
      return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
    }
  }

  const riskScore = 100 - input.result.score
  if (riskScore > input.policy.maxRiskScore) {
    reasons.push(`risk score ${riskScore} exceeds ${input.policy.maxRiskScore}`)
    if (input.degraded && !isConfidenceAtLeast(input.confidence, input.policy.minimumConfidence)) {
      return { action: 'warn', confidence: input.confidence, reasons, overridesApplied: [] }
    }
    return { action: 'block', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (!isConfidenceAtLeast(input.confidence, input.policy.minimumConfidence)) {
    reasons.push(`confidence ${input.confidence} below ${input.policy.minimumConfidence}`)
    return { action: 'warn', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  if (input.graph && input.policy.allowInstallScripts === 'warn' && input.graph.scriptWarnings?.length) {
    reasons.push('install scripts require caution')
    return { action: 'warn', confidence: input.confidence, reasons, overridesApplied: [] }
  }

  return { action: 'allow', confidence: input.confidence, reasons: reasons.length ? reasons : ['policy checks passed'], overridesApplied: [] }
}
