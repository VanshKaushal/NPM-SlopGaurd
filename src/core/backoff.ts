export function computeBackoffDelay(
  attempt: number,
  minDelayMs: number,
  maxDelayMs: number,
  jitter: boolean
) {
  const base = Math.min(maxDelayMs, minDelayMs * Math.pow(2, Math.max(0, attempt - 1)))
  if (!jitter) return base
  const factor = 0.5 + Math.random()
  return Math.min(maxDelayMs, Math.round(base * factor))
}
