import { computeBackoffDelay } from './backoff.js'

export type RetryOptions = {
  retries: number
  minDelayMs: number
  maxDelayMs: number
  jitter: boolean
  retryableStatuses: number[]
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
  shouldRetry: (err: unknown) => boolean,
  canRetry: () => boolean
): Promise<T> {
  let attempt = 0
  let lastError: unknown

  while (attempt <= options.retries) {
    attempt += 1
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      if (!shouldRetry(err) || attempt > options.retries) break
      if (!canRetry()) break
      const delay = computeBackoffDelay(attempt, options.minDelayMs, options.maxDelayMs, options.jitter)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
