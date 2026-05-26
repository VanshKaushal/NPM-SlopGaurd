export type BenchmarkResult<T> = {
  result: T
  durationMs: number
}

export async function benchmark<T>(fn: () => Promise<T>): Promise<BenchmarkResult<T>> {
  const start = Date.now()
  const result = await fn()
  return { result, durationMs: Date.now() - start }
}
