import { SignalResult, SIGNAL_WEIGHTS } from '../types.js'

export function scoreSignals(results: Record<string, SignalResult>) {
  let score = 100
  for (const [name, w] of Object.entries(SIGNAL_WEIGHTS)) {
    const sig = results[name]
    if (sig) {
      if (sig.offlineUnknown) {
        score -= (w.weight / 2)
      } else if (!sig.passed && !w.hardFail) {
        score -= w.weight
      }
    }
  }
  if (score < 0) score = 0
  return score
}
