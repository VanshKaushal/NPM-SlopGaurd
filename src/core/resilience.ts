import { RetryableError, TimeoutError, NetworkError } from './errors.js'
import { retry, RetryOptions } from './retry.js'
import { createTimeoutSignal } from './timeout.js'
import { CircuitBreaker, CircuitBreakerOptions, CircuitState } from './circuit-breaker.js'
import { metrics } from './metrics.js'
import { defaultRequestManager, RequestManager } from './request-manager.js'

export type RequestPolicy = {
  name: string
  timeoutMs: number
  retry: RetryOptions
  circuit: CircuitBreakerOptions
}

export type ResilientResult = {
  response: Response | null
  degraded?: string
  error?: unknown
  circuitState?: CircuitState
}

const circuits = new Map<string, CircuitBreaker>()

function getCircuit(policy: RequestPolicy) {
  const existing = circuits.get(policy.name)
  if (existing) return existing
  const created = new CircuitBreaker(policy.circuit)
  circuits.set(policy.name, created)
  return created
}

function isRetryableError(err: unknown) {
  if (err instanceof RetryableError) return true
  if (err instanceof TimeoutError) return true
  if (err instanceof NetworkError) return true
  return false
}

export async function resilientFetch(
  url: string,
  init: RequestInit,
  policy: RequestPolicy,
  manager: RequestManager = defaultRequestManager
): Promise<ResilientResult> {
  const circuit = getCircuit(policy)
  if (!circuit.canRequest()) {
    metrics.inc(`${policy.name}.circuit_open`)
    return { response: null, degraded: 'circuit_open', circuitState: circuit.getState() }
  }

  const start = Date.now()

  try {
    const response = await manager.run(`${policy.name}:${url}`, async () => {
      return await retry(async attempt => {
        const timeout = createTimeoutSignal(policy.timeoutMs)
        try {
          const res = await fetch(url, { ...init, signal: timeout.signal })
          if (policy.retry.retryableStatuses.includes(res.status)) {
            throw new RetryableError(`retryable_status:${res.status}`, { status: res.status })
          }
          return res
        } catch (err: any) {
          if (err?.name === 'AbortError') throw new TimeoutError()
          if (err instanceof RetryableError || err instanceof TimeoutError) throw err
          const code = typeof err?.code === 'string' ? err.code : undefined
          throw new NetworkError('network_error', code)
        } finally {
          timeout.cancel()
          metrics.inc(`${policy.name}.attempts`)
        }
      }, policy.retry, isRetryableError, () => manager.canRetry())
    })

    circuit.recordSuccess()
    metrics.observe(`${policy.name}.latency`, Date.now() - start)
    return { response, circuitState: circuit.getState() }
  } catch (err) {
    circuit.recordFailure()
    metrics.inc(`${policy.name}.failures`)
    metrics.observe(`${policy.name}.latency`, Date.now() - start)

    if (err instanceof TimeoutError) {
      return { response: null, degraded: 'timeout', error: err, circuitState: circuit.getState() }
    }
    if (err instanceof RetryableError) {
      return { response: null, degraded: 'retry_exhausted', error: err, circuitState: circuit.getState() }
    }
    return { response: null, degraded: 'network', error: err, circuitState: circuit.getState() }
  }
}
