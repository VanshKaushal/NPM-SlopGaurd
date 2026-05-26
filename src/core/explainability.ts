import { ValidationResult } from '../types.js'
import { computeConfidence } from './confidence.js'

export type ExplainabilityReport = {
  risk: 'low' | 'medium' | 'high'
  confidence: 'low' | 'medium' | 'high'
  reasons: string[]
}

const ORDERED_SIGNALS = [
  'existence',
  'hotlist',
  'publisher_age',
  'version_age',
  'download_velocity',
  'provenance'
]

const SIGNAL_REASON: Record<string, (message?: string) => string> = {
  existence: message => `package existence check failed${message ? ` (${message})` : ''}`,
  hotlist: () => 'package is on the hotlist',
  publisher_age: message => `publisher account age below threshold${message ? ` (${message})` : ''}`,
  version_age: message => `version age below threshold${message ? ` (${message})` : ''}`,
  download_velocity: message => `download velocity below threshold${message ? ` (${message})` : ''}`,
  provenance: message => `missing provenance attestation${message ? ` (${message})` : ''}`
}

function classifyRisk(result: ValidationResult) {
  if (result.hardBlocked || result.score < 50) return 'high'
  if (result.score < 75) return 'medium'
  return 'low'
}

export function explainResult(result: ValidationResult): ExplainabilityReport {
  const reasons: string[] = []

  for (const name of ORDERED_SIGNALS) {
    const sig = result.raw[name]
    if (!sig) continue
    if (sig.passed) continue
    const formatter = SIGNAL_REASON[name] ?? (msg => `signal ${name} failed${msg ? ` (${msg})` : ''}`)
    reasons.push(formatter(sig.message))
  }

  if (reasons.length === 0) {
    reasons.push('no risk signals triggered')
  }

  const confidence = computeConfidence(result)

  return {
    risk: classifyRisk(result),
    confidence: confidence.level,
    reasons
  }
}
