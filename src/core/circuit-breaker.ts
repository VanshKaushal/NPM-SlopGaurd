export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export type CircuitBreakerOptions = {
  failureThreshold: number
  windowMs: number
  cooldownMs: number
  halfOpenMax: number
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures: number[] = []
  private openUntil = 0
  private halfOpenAttempts = 0

  constructor(private options: CircuitBreakerOptions) {}

  canRequest() {
    const now = Date.now()
    if (this.state === CircuitState.OPEN) {
      if (now >= this.openUntil) {
        this.state = CircuitState.HALF_OPEN
        this.halfOpenAttempts = 0
        return true
      }
      return false
    }

    if (this.state === CircuitState.HALF_OPEN) {
      return this.halfOpenAttempts < this.options.halfOpenMax
    }

    return true
  }

  recordSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts += 1
      this.state = CircuitState.CLOSED
      this.failures = []
      return
    }
    this.failures = []
  }

  recordFailure() {
    const now = Date.now()
    this.failures.push(now)
    this.failures = this.failures.filter(ts => now - ts <= this.options.windowMs)

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN
      this.openUntil = now + this.options.cooldownMs
      return
    }

    if (this.failures.length >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN
      this.openUntil = now + this.options.cooldownMs
    }
  }

  getState() {
    return this.state
  }
}
