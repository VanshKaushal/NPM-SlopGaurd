import { createLimiter, createDedupe } from './concurrency.js'

export type RequestManagerOptions = {
  concurrency: number
  retryBudget: number
  retryWindowMs: number
}

export class RequestManager {
  private limiter
  private dedupe
  private retryTimestamps: number[] = []

  constructor(private options: RequestManagerOptions) {
    this.limiter = createLimiter(options.concurrency)
    this.dedupe = createDedupe()
  }

  async run<T>(key: string, fn: () => Promise<T>) {
    return await this.dedupe(key, () => this.limiter(fn))
  }

  canRetry() {
    const now = Date.now()
    this.retryTimestamps = this.retryTimestamps.filter(ts => now - ts <= this.options.retryWindowMs)
    if (this.retryTimestamps.length >= this.options.retryBudget) return false
    this.retryTimestamps.push(now)
    return true
  }
}

export const defaultRequestManager = new RequestManager({
  concurrency: 8,
  retryBudget: 50,
  retryWindowMs: 10000
})
