type CacheEntry<T> = { value: T; expiresAt: number }

export class TTLCache {
  private map = new Map<string, CacheEntry<any>>()

  constructor(private defaultTtlMs = 1000 * 60 * 5) {}

  get<T>(key: string): T | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      return undefined
    }
    return entry.value
  }

  set<T>(key: string, value: T, ttlMs?: number) {
    const ttl = ttlMs ?? this.defaultTtlMs
    this.map.set(key, { value, expiresAt: Date.now() + ttl })
  }

  has(key: string) {
    return this.get(key) !== undefined
  }

  delete(key: string) {
    return this.map.delete(key)
  }

  clear() {
    this.map.clear()
  }
}
