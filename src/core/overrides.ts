export type OverrideAction = 'allow' | 'warn' | 'block'

export type PolicyOverride = {
  name: string
  action: OverrideAction
  reason?: string
  expiresAt?: string
}

function isExpired(entry: PolicyOverride, now = Date.now()) {
  if (!entry.expiresAt) return false
  const ts = Date.parse(entry.expiresAt)
  if (Number.isNaN(ts)) return false
  return ts <= now
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

export function loadOverridesConfig(input: unknown): PolicyOverride[] {
  if (!Array.isArray(input)) return []
  const entries: PolicyOverride[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const name = (item as any).name
    const action = (item as any).action
    if (!name || !action) continue
    if (action !== 'allow' && action !== 'warn' && action !== 'block') continue
    entries.push({
      name: String(name),
      action,
      reason: (item as any).reason ? String((item as any).reason) : undefined,
      expiresAt: (item as any).expiresAt ? String((item as any).expiresAt) : undefined
    })
  }
  return entries
}

export function findOverrides(name: string, overrides: PolicyOverride[]): PolicyOverride[] {
  const matches: PolicyOverride[] = []
  for (const entry of overrides) {
    if (isExpired(entry)) continue
    if (matchesPattern(name, entry.name)) matches.push(entry)
  }
  return matches
}
