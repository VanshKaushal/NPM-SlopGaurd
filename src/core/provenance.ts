import { TTLCache } from './cache.js'
import { createDedupe } from './concurrency.js'
import { resilientFetch, RequestPolicy } from './resilience.js'

const ATTEST_BASE = 'https://registry.npmjs.org/-/npm/v1/attestations'

const cache = new TTLCache(1000 * 60 * 30)
const dedupe = createDedupe()

const attestPolicy: RequestPolicy = {
  name: 'attestation',
  timeoutMs: 4000,
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

export async function getAttestation(
  pkgName: string,
  version: string,
  timeoutMs = 3000
): Promise<{ hasAttestation: boolean | null }>{
  const key = `attest:${pkgName}@${version}`
  const cached = cache.get<{ hasAttestation: boolean | null }>(key)
  if (cached) return cached

  return dedupe(key, async () => {
    try {
      const url = `${ATTEST_BASE}/${encodeURIComponent(pkgName)}@${encodeURIComponent(version)}`
      const policy = { ...attestPolicy, timeoutMs }
      const { response } = await resilientFetch(url, {}, policy)
      if (!response) {
        cache.set(key, { hasAttestation: null }, 1000 * 5)
        return { hasAttestation: null }
      }
      if (response.status === 404) {
        const result = { hasAttestation: false }
        cache.set(key, result, 1000 * 60 * 60)
        return result
      }
      if (!response.ok) {
        cache.set(key, { hasAttestation: null }, 1000 * 5)
        return { hasAttestation: null }
      }
      const json = (await response.json()) as any
      const hasAttestation = Array.isArray(json?.attestations)
        ? json.attestations.length > 0
        : Boolean(json?.attestation)
      const result = { hasAttestation }
      cache.set(key, result, 1000 * 60 * 60)
      return result
    } catch (err) {
      cache.set(key, { hasAttestation: null }, 1000 * 5)
      return { hasAttestation: null }
    }
  })
}
