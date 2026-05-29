import { TTLCache } from './cache.js'
import { createDedupe } from './concurrency.js'
import { resilientFetch, RequestPolicy } from './resilience.js'

const REGISTRY_BASE = 'https://registry.npmjs.org'
const USER_BASE = 'https://registry.npmjs.org/-/user/org.couchdb.user:'

const cache = new TTLCache(1000 * 60 * 30)
const dedupe = createDedupe()

const registryPolicy: RequestPolicy = {
  name: 'registry',
  timeoutMs: 5000,
  retry: {
    retries: 2,
    minDelayMs: 200,
    maxDelayMs: 1200,
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

const userPolicy: RequestPolicy = {
  name: 'registry_user',
  timeoutMs: 5000,
  retry: {
    retries: 2,
    minDelayMs: 200,
    maxDelayMs: 1200,
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

type PackageMetadata = {
  name: string
  time?: Record<string, string>
  maintainers?: Array<{ name: string; email?: string }>
  distTags?: Record<string, string>
  versions?: Record<string, any>
}

export async function checkPackageExists(
  pkgName: string,
  timeoutMs = 3000
): Promise<{ exists: boolean | null; status: number; degraded?: string; score_penalty?: number }> {
  const key = `registry:exists:${pkgName}`
  const cached = cache.get<{ exists: boolean | null; status: number; degraded?: string; score_penalty?: number }>(key)
  if (cached) return cached

  return dedupe(key, async () => {
    try {
      const url = `${REGISTRY_BASE}/${encodeURIComponent(pkgName)}`
      const policy = { ...registryPolicy, timeoutMs }
      const { response, degraded } = await resilientFetch(url, {}, policy)
      if (degraded === 'circuit_open') {
        const result = { degraded: 'circuit_open', exists: false, score_penalty: 40, status: 0 }
        cache.set(key, result, 1000 * 10)
        return result
      }
      if (!response) {
        const result = { exists: null, status: 0 }
        cache.set(key, result, 1000 * 10)
        return result
      }
      const result = { exists: response.status !== 404, status: response.status }
      cache.set(key, result, 1000 * 60 * 30)
      return result
    } catch (err) {
      const result = { exists: null, status: 0 }
      cache.set(key, result, 1000 * 10)
      return result
    }
  })
}

export async function getPackageMetadata(
  pkgName: string,
  timeoutMs = 4000
): Promise<PackageMetadata | null> {
  const key = `registry:meta:${pkgName}`
  const cached = cache.get<PackageMetadata | null>(key)
  if (cached) return cached

  return dedupe(key, async () => {
    try {
      const url = `${REGISTRY_BASE}/${encodeURIComponent(pkgName)}`
      const policy = { ...registryPolicy, timeoutMs }
      const { response } = await resilientFetch(url, {}, policy)
      if (!response || !response.ok) {
        cache.set(key, null, 1000 * 5)
        return null
      }
      const json = (await response.json()) as any
      const meta: PackageMetadata = {
        name: json.name,
        time: json.time,
        maintainers: json.maintainers,
        distTags: json['dist-tags'],
        versions: json.versions
      }
      cache.set(key, meta, 1000 * 60 * 30)
      return meta
    } catch (err) {
      cache.set(key, null, 1000 * 5)
      return null
    }
  })
}

export async function getUserInfo(
  username: string,
  timeoutMs = 3000
): Promise<{ created?: string } | null> {
  const key = `registry:user:${username}`
  const cached = cache.get<{ created?: string } | null>(key)
  if (cached) return cached

  return dedupe(key, async () => {
    try {
      const url = `${USER_BASE}${encodeURIComponent(username)}`
      const policy = { ...userPolicy, timeoutMs }
      const { response } = await resilientFetch(url, {}, policy)
      if (!response || !response.ok) {
        cache.set(key, null, 1000 * 10)
        return null
      }
      const json = (await response.json()) as any
      const created = json.time?.created || json.created || json?.date || undefined
      const result = { created }
      cache.set(key, result, 1000 * 60 * 60)
      return result
    } catch (err) {
      cache.set(key, null, 1000 * 10)
      return null
    }
  })
}
