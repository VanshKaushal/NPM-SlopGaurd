export function matchesPattern(name: string, pattern: string, allowSubstring: boolean): boolean {
  if (!pattern) return false
  
  // Tier 4: Substring match
  if (pattern.startsWith('contains:')) {
    if (!allowSubstring) return false
    const sub = pattern.slice('contains:'.length)
    return name.includes(sub)
  }
  
  // Tier 2: Scope match
  if (pattern.startsWith('@') && pattern.endsWith('/*')) {
    const scope = pattern.slice(0, -2)
    return name.startsWith(`${scope}/`)
  }
  
  // Tier 3: Glob match
  if (pattern.includes('*') || pattern.includes('?')) {
    const regexStr = '^' + pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + '$'
    const regex = new RegExp(regexStr)
    return regex.test(name)
  }
  
  // Tier 1: Exact match
  return name === pattern
}

declare module './allowlist.js' {
  export function matchAllowlist(pkg: string, list: any, allowSubstringMatching?: boolean): string | null;
}

declare module './blocklist.js' {
  export function matchBlocklist(pkg: string, list: any, allowSubstringMatching?: boolean): string | null;
}
