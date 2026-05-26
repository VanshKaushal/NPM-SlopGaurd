export type ScriptRiskLevel = 'low' | 'medium' | 'high'

export type ScriptRisk = {
  script: string
  command: string
  level: ScriptRiskLevel
  reason: string
}

const RISK_LEVELS: Record<string, ScriptRiskLevel> = {
  preinstall: 'high',
  postinstall: 'high',
  install: 'medium',
  prepare: 'low'
}

const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(curl|wget)\b/i, reason: 'remote download' },
  { pattern: /\b(powershell|pwsh)\b/i, reason: 'powershell execution' },
  { pattern: /\b(sh|bash)\s+-c\b/i, reason: 'shell execution' },
  { pattern: /\b(node|python)\s+-e\b/i, reason: 'inline execution' },
  { pattern: /\b(base64)\b/i, reason: 'base64 decoding' },
  { pattern: /\b(certutil|bitsadmin)\b/i, reason: 'windows download tooling' }
]

export function analyzeInstallScripts(scripts: Record<string, string> | undefined) {
  if (!scripts) return [] as ScriptRisk[]
  const results: ScriptRisk[] = []

  for (const [name, command] of Object.entries(scripts)) {
    if (!RISK_LEVELS[name]) continue
    const level = RISK_LEVELS[name]
    const reasons = SUSPICIOUS_PATTERNS.filter(entry => entry.pattern.test(command))
    if (reasons.length === 0) continue
    for (const reason of reasons) {
      results.push({
        script: name,
        command,
        level,
        reason: reason.reason
      })
    }
  }

  return results
}
