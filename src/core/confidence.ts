import { ValidationResult } from '../types.js'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type ConfidenceReport = {
  level: ConfidenceLevel
  missingSignals: string[]
  totalSignals: number
}

const UNKNOWN_MARKERS = ['unknown', 'offline-skip']

function isUnknownMessage(message?: string) {
  if (!message) return false
  return UNKNOWN_MARKERS.some(marker => message.includes(marker))
}

export function computeConfidence(result: ValidationResult): ConfidenceReport {
  const signals = Object.values(result.raw)
  const missing = signals.filter(sig => isUnknownMessage(sig.message)).map(sig => sig.name)

  const totalSignals = signals.length
  const missingCount = missing.length

  if (result.hardBlocked) {
    return { level: 'high', missingSignals: missing, totalSignals }
  }

  if (totalSignals === 0 || missingCount >= 3) {
    return { level: 'low', missingSignals: missing, totalSignals }
  }

  if (missingCount > 0) {
    return { level: 'medium', missingSignals: missing, totalSignals }
  }

  return { level: 'high', missingSignals: missing, totalSignals }
}
