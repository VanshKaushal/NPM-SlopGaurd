export type BlocklistConfig = {
  block: string[]
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

export function loadBlocklistConfig(input: unknown): BlocklistConfig {
  if (Array.isArray(input)) return { block: normalizeList(input.filter(Boolean) as string[]) }
  if (input && typeof input === 'object' && Array.isArray((input as any).block)) {
    return { block: normalizeList((input as any).block as string[]) }
  }
  return { block: [] }
}

export function matchBlocklist(name: string, blocklist: BlocklistConfig): string | null {
  for (const entry of blocklist.block) {
    if (matchesPattern(name, entry)) return entry
  }
  return null
}
