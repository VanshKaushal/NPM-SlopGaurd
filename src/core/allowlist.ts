export type AllowlistConfig = {
  allow: string[]
}

function normalizeList(list: string[]) {
  return Array.from(new Set(list.map(entry => entry.trim()).filter(Boolean)))
}

function matchesPattern(name: string, pattern: string) {
  if (!pattern) return false
  if (pattern === name) return true
  if (pattern.startsWith('@') && pattern.endsWith('/*')) {
    const scope = pattern.slice(0, -2)
    return name.startsWith(`${scope}/`)
  }
  return false
}

export function loadAllowlistConfig(input: unknown): AllowlistConfig {
  if (Array.isArray(input)) return { allow: normalizeList(input.filter(Boolean) as string[]) }
  if (input && typeof input === 'object' && Array.isArray((input as any).allow)) {
    return { allow: normalizeList((input as any).allow as string[]) }
  }
  return { allow: [] }
}

export function matchAllowlist(name: string, allowlist: AllowlistConfig): string | null {
  for (const entry of allowlist.allow) {
    if (matchesPattern(name, entry)) return entry
  }
  return null
}
