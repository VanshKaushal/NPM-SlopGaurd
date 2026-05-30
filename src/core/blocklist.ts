export type BlocklistConfig = {
  block: string[]
}

function normalizeList(list: string[]) {
  return Array.from(new Set(list.map(entry => entry.trim()).filter(Boolean)))
}

import { matchesPattern } from './pattern-matching.js'

export function loadBlocklistConfig(input: unknown): BlocklistConfig {
  if (Array.isArray(input)) return { block: normalizeList(input.filter(Boolean) as string[]) }
  if (input && typeof input === 'object' && Array.isArray((input as any).block)) {
    return { block: normalizeList((input as any).block as string[]) }
  }
  return { block: [] }
}

export function matchBlocklist(name: string, blocklist: BlocklistConfig, allowSubstringMatching: boolean = false): string | null {
  for (const entry of blocklist.block) {
    if (matchesPattern(name, entry, allowSubstringMatching)) return entry
  }
  return null
}
