import { ConfidenceLevel } from './confidence.js'

export type PolicyAction = 'allow' | 'warn' | 'block'

export type PolicyDecision = {
  action: PolicyAction
  confidence: ConfidenceLevel
  reasons: string[]
  overridesApplied: string[]
}

const CONFIDENCE_ORDER: Record<ConfidenceLevel, number> = {
  low: 0,
  medium: 1,
  high: 2
}

export function isConfidenceAtLeast(level: ConfidenceLevel, minimum: ConfidenceLevel) {
  return CONFIDENCE_ORDER[level] >= CONFIDENCE_ORDER[minimum]
}
