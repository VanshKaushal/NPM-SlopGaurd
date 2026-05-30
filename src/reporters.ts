import { validatePackage } from './core/validator.js'
import { validateDependencyGraph } from './core/graph.js'

const SLOPGUARD_VERSION = '0.1.0'

function generateTraceId(): string {
  // RFC 4122 UUID v4
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
  const hex = bytes.map(b => b.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-')
}

function buildPackageEntry(res: Awaited<ReturnType<typeof validatePackage>>) {
  const decision = res.hardBlocked ? 'block' : res.score < 75 ? 'warn' : 'allow'
  const reasons = Object.values(res.raw)
    .filter(sig => !sig.passed && sig.message)
    .map(sig => sig.message as string)
  if (!reasons.length) reasons.push(decision === 'allow' ? 'policy checks passed' : 'package flagged by policy')
  return {
    name: res.pkg,
    version: res.version ?? null,
    score: res.score,
    decision,
    signals: Object.fromEntries(
      Object.entries(res.raw).map(([k, v]) => [k, { passed: v.passed, message: v.message ?? null }])
    ),
    reasons
  }
}

export function reportJson(result: any) {
  const scanStart = result._scanStartMs ?? Date.now()
  const scanDurationMs = Date.now() - scanStart

  let packages: ReturnType<typeof buildPackageEntry>[]
  let blocked = 0
  let warned = 0

  if (Array.isArray(result)) {
    // Array of single-package results
    packages = result.map((r: any) => {
      const entry = buildPackageEntry(r)
      if (entry.decision === 'block') blocked++
      else if (entry.decision === 'warn') warned++
      return entry
    })
  } else if ('score' in result) {
    // Single package result
    const entry = buildPackageEntry(result)
    if (entry.decision === 'block') blocked++
    else if (entry.decision === 'warn') warned++
    packages = [entry]
  } else if ('results' in result) {
    // Graph validation result
    packages = result.results.map((r: any) => {
      const entry = buildPackageEntry(r)
      if (entry.decision === 'block') blocked++
      else if (entry.decision === 'warn') warned++
      return entry
    })
  } else {
    packages = []
  }

  const output = {
    slopguard_version: SLOPGUARD_VERSION,
    scan_timestamp: new Date().toISOString(),
    trace_id: generateTraceId(),
    summary: {
      total_packages: packages.length,
      blocked,
      warned,
      passed: packages.length - blocked - warned,
      scan_duration_ms: scanDurationMs
    },
    packages
  }

  console.log(JSON.stringify(output, null, 2))
}

export function reportSarif(result: Awaited<ReturnType<typeof validateDependencyGraph>> | Awaited<ReturnType<typeof validatePackage>>) {
  const sarif: any = {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'SlopGuard',
          informationUri: 'https://github.com/slopguard',
          version: SLOPGUARD_VERSION
        }
      },
      results: []
    }]
  }

  // Handle single package validation result
  if ('score' in result) {
    const decision = result.hardBlocked ? 'block' : result.score < 75 ? 'warn' : 'allow'
    if (decision !== 'allow') {
      sarif.runs[0].results.push({
        ruleId: 'SG-001',
        level: decision === 'block' ? 'error' : 'warning',
        message: { text: `Package ${result.pkg}@${result.version} has risk score ${100 - result.score}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: 'package.json' }
          }
        }]
      })
    }
  } else if ('results' in result) {
    // Handle graph validation result
    for (const res of result.results) {
      const decision = res.hardBlocked ? 'block' : res.score < 75 ? 'warn' : 'allow'
      if (decision !== 'allow') {
        sarif.runs[0].results.push({
          ruleId: 'SG-001',
          level: decision === 'block' ? 'error' : 'warning',
          message: { text: `Package ${res.pkg}@${res.version} has risk score ${100 - res.score}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'package-lock.json' }
            }
          }]
        })
      }
    }
  }

  console.log(JSON.stringify(sarif, null, 2))
}
