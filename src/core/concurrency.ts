export function createLimiter(max: number) {
  let active = 0
  const queue: Array<() => void> = []

  const next = () => {
    active -= 1
    const job = queue.shift()
    if (job) job()
  }

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) {
      await new Promise<void>(resolve => queue.push(resolve))
    }
    active += 1
    try {
      return await fn()
    } finally {
      next()
    }
  }
}

export function createDedupe() {
  const inflight = new Map<string, Promise<any>>()

  return async function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = inflight.get(key)
    if (cached) return cached as Promise<T>
    const p = fn().finally(() => inflight.delete(key))
    inflight.set(key, p)
    return p
  }
}
