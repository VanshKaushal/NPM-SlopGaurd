export type DegradationReason = 'circuit_open' | 'timeout' | 'retry_exhausted' | 'network'

export type DegradedSignal = {
  name: string
  reason: DegradationReason
}

export function describeDegraded(reason: DegradationReason) {
  if (reason === 'circuit_open') return 'circuit open'
  if (reason === 'timeout') return 'timeout'
  if (reason === 'retry_exhausted') return 'retry exhausted'
  return 'network error'
}
