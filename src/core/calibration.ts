import { ValidationResult } from '../types.js'

export type CalibrationConfig = {
  warningScore: number
  unsafeScore: number
}

export const DEFAULT_CALIBRATION: CalibrationConfig = {
  warningScore: 75,
  unsafeScore: 50
}

export function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function classifyScore(score: number, config: CalibrationConfig = DEFAULT_CALIBRATION) {
  const normalized = normalizeScore(score)
  if (normalized < config.unsafeScore) return 'unsafe'
  if (normalized < config.warningScore) return 'warning'
  return 'safe'
}

export function calibrateResult(result: ValidationResult, config: CalibrationConfig = DEFAULT_CALIBRATION) {
  return {
    ...result,
    score: normalizeScore(result.score),
    band: classifyScore(result.score, config)
  }
}
