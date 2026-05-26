import { TimeoutError } from './errors.js'

export function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(id)
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: NodeJS.Timeout | null = null
  try {
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError()), timeoutMs)
    })
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
