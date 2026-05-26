import { TTLCache } from './cache.js'
import { createDedupe } from './concurrency.js'
import { resilientFetch, RequestPolicy } from './resilience.js'

const DOWNLOADS_BASE = 'https://api.npmjs.org/downloads/point/last-week'

const cache = new TTLCache(1000 * 60 * 30)
const dedupe = createDedupe()

const downloadsPolicy: RequestPolicy = {
  name: 'downloads',
  timeoutMs: 3000,
  retry: {
    retries: 2,
    minDelayMs: 200,
    maxDelayMs: 1000,
    jitter: true,
    retryableStatuses: [429, 500, 502, 503, 504]
  },
  circuit: {
    failureThreshold: 5,
    windowMs: 10000,
    cooldownMs: 20000,
    halfOpenMax: 2
  }
}

export async function getDownloadsLastWeek(
  pkgName: string,
  timeoutMs = 3000
): Promise<{ downloads: number | null }>{
  const key = `downloads:${pkgName}`
  const cached = cache.get<{ downloads: number | null }>(key)
  if (cached) return cached

  return dedupe(key, async () => {
    try {
      const url = `${DOWNLOADS_BASE}/${encodeURIComponent(pkgName)}`
      const policy = { ...downloadsPolicy, timeoutMs }
      const { response } = await resilientFetch(url, {}, policy)
      if (!response || !response.ok) {
        cache.set(key, { downloads: null }, 1000 * 5)
        return { downloads: null }
      }
      const json = (await response.json()) as any
      const downloads = typeof json.downloads === 'number' ? json.downloads : null
      const result = { downloads }
      cache.set(key, result, 1000 * 60 * 30)
      return result
    } catch (err) {
      cache.set(key, { downloads: null }, 1000 * 5)
      return { downloads: null }
    }
  })
}
