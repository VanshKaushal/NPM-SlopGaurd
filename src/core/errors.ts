export class ValidationError extends Error {
  readonly kind = 'ValidationError'
}

export class RetryableError extends Error {
  readonly kind = 'RetryableError'
  readonly status?: number
  readonly code?: string

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.status = options?.status
    this.code = options?.code
  }
}

export class TimeoutError extends Error {
  readonly kind = 'TimeoutError'

  constructor(message = 'Request timed out') {
    super(message)
  }
}

export class GraphError extends Error {
  readonly kind = 'GraphError'
}

export class ParserError extends Error {
  readonly kind = 'ParserError'
}

export class NetworkError extends Error {
  readonly kind = 'NetworkError'
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}
