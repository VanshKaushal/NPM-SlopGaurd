#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { validatePackage } from './core/validator.js'
import { createLimiter } from './core/concurrency.js'
import { loadConfig, mergeConfig } from './core/config.js'
import { validateDependencyGraph } from './core/graph.js'
import { explainResult } from './core/explainability.js'
import { parseInstallArgs } from './install/args.js'
import { runProxyInstall } from './install/proxy-install.js'

import { reportJson, reportSarif } from './reporters.js'

const SLOPGUARD_VERSION = '0.1.0'

const HELP_TEXT = `
SlopGuard v${SLOPGUARD_VERSION} — Zero-infrastructure npm package validation firewall

USAGE:
  slopguard check <pkg[@version]> [flags]
  slopguard scan [flags]
  slopguard scan --recursive [flags]
  slopguard scan-workspace [flags]
  slopguard install <pkg[@version]> [--dry-run]

COMMANDS:
  check <pkg>          Validate a single package against policy
  scan                 Scan all packages in the current package.json
  scan --recursive     Scan the full dependency graph from lockfile
  scan-workspace       Scan all packages in a monorepo workspace
  install <pkg>        Proxy npm install with pre-install validation

FLAGS:
  --output=json        Output scan results as structured JSON
  --output=sarif       Output scan results in SARIF 2.1.0 format
  --json               Alias for --output=json
  --sarif              Alias for --output=sarif
  --policy=<mode>      Override the active policy mode (see POLICY MODES)
  --offline            Run in offline mode (skip registry checks, 50% score penalty)
  --dry-run            For install: validate without actually installing
  --allow              Allowlist the package for this check only
  --ignore-warnings    Exit 0 even when warnings are present
  --verify-integrity=shallow|deep|false  Control lockfile integrity verification

POLICY MODES:
  permissive           Minimal blocking, warnings only (for experimentation)
  balanced             Default. Balanced between strictness and usability
  strict               Tighter controls, provenance recommended
  paranoid             Maximum strictness. Blocks new packages and missing provenance
  enterprise-policy    Regulated enterprise environments. maxRiskScore=30, requireProvenance=true,
                       requireLockfile=true, minPublisherAgeDays=90, fail-closed circuit breaker
  fintech-policy       Financial services. All enterprise controls + deep integrity checks,
                       substring blocklist matching, mandatory audit logging
  ai-agent-policy      AI/ML pipeline use. requireProvenance=false (AI pkgs lack it),
                       allowedScopes=[@openai, @anthropic, @huggingface, @langchain, @llamaindex]
  ci-lockdown-policy   Reproducible CI. frozenLockfile=true, blockOnCircuitOpen=true,
                       mutable git refs blocked, install scripts blocked

EXIT CODES:
  0   All packages pass — safe to proceed
  1   One or more packages trigger WARN — review before proceeding
  2   One or more packages BLOCKED — do not install
  3   Internal error — check stderr for details

EXAMPLES:
  slopguard check react@18.2.0
  slopguard scan --output=json
  slopguard scan --output=sarif > results.sarif
  slopguard scan --policy=enterprise-policy
  slopguard scan --recursive --verify-integrity=deep
  slopguard install lodash@4.17.21 --dry-run
`

function printResult(pkg: string, res: Awaited<ReturnType<typeof validatePackage>>) {
  console.log(chalk.bold(pkg))
  for (const sig of Object.values(res.raw)) {
    const status = sig.passed ? chalk.green('OK') : chalk.yellow('WARN')
    const msg = sig.message ? ` - ${sig.message}` : ''
    console.log(`  ${status} ${sig.name}${msg}`)
  }
  if (res.hardBlocked) console.log(chalk.red('HARD BLOCK — package is unsafe'))
  else if (res.score < 50) console.log(chalk.red(`Unsafe (score ${res.score})`))
  else if (res.score < 75) console.log(chalk.yellow(`Warning (score ${res.score})`))
  else console.log(chalk.green(`Safe (score ${res.score})`))
  printExplainability(res)
}

function parseFlags(args: string[]) {
  const flags = new Set(args.filter(a => a.startsWith('--')))
  let verifyIntegrity: 'shallow' | 'deep' | false | undefined;
  if (args.includes('--verify-integrity=deep')) verifyIntegrity = 'deep';
  else if (args.includes('--verify-integrity=shallow')) verifyIntegrity = 'shallow';
  else if (args.includes('--verify-integrity=false')) verifyIntegrity = false;

  const outputFlag = args.find(a => a.startsWith('--output='))
  const outputMode = outputFlag ? outputFlag.split('=')[1] : null

  return {
    allow: flags.has('--allow'),
    ignoreWarnings: flags.has('--ignore-warnings'),
    verifyIntegrity,
    json: flags.has('--json') || outputMode === 'json',
    sarif: flags.has('--sarif') || outputMode === 'sarif'
  }
}

async function scanPackageJson(cwd: string) {
  const file = path.resolve(cwd, 'package.json')
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw) as any
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.optionalDependencies }
  return Object.keys(deps)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h' || args[0] === 'help') {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  const cmd = args[0]
  const flags = parseFlags(args)

  let baseConfig: any
  try {
    baseConfig = await loadConfig()
  } catch (err: any) {
    console.error(`SlopGuard internal error loading config: ${err?.message ?? err}`)
    console.error('Check your slopguard.config.js or .slopguardrc configuration file.')
    process.exit(3)
  }

  if (cmd === 'check' && args[1]) {
    const pkg = args[1]
    if (!flags.json && !flags.sarif) console.log(chalk.blue(`Validating ${pkg}...`))
    try {
      const cfg = mergeConfig({ ...baseConfig, allowlist: flags.allow ? [pkg] : baseConfig.allowlist })
      const res = await validatePackage(pkg, cfg)

      if (flags.json) reportJson(res)
      else if (flags.sarif) reportSarif(res)
      else printResult(pkg, res)

      if (res.hardBlocked) process.exit(2)
      if (!flags.ignoreWarnings && res.score < 75) process.exit(1)
      process.exit(0)
    } catch (err: any) {
      console.error(`SlopGuard error validating package "${pkg}": ${err?.message ?? err}`)
      console.error('Ensure the package name and version are valid and the registry is reachable.')
      process.exit(3)
    }
  }

  if (cmd === 'scan') {
    try {
      if (args.includes('--recursive')) {
        const result = await validateDependencyGraph({
          cwd: process.cwd(),
          recursive: false,
          verifyIntegrity: flags.verifyIntegrity
        })

        if (flags.json) reportJson(result)
        else if (flags.sarif) reportSarif(result)
        else printGraphResult(result)

        if (result.blocked > 0) process.exit(2)
        if (result.warnings > 0 && !flags.ignoreWarnings) process.exit(1)
        process.exit(0)
      } else {
        const packages = await scanPackageJson(process.cwd())
        const limit = createLimiter(10)
        const results = []
        for (const pkg of packages) {
          const res = await limit(() => validatePackage(pkg, baseConfig))
          results.push(res)
        }
        const blocked = results.filter(r => r.hardBlocked).length
        const warned = results.filter(r => !r.hardBlocked && r.score < 75).length

        if (flags.json) reportJson(results)
        else if (flags.sarif) reportSarif({ results } as any)
        else results.forEach(r => printResult(r.pkg, r))

        if (blocked > 0) process.exit(2)
        if (warned > 0 && !flags.ignoreWarnings) process.exit(1)
        process.exit(0)
      }
    } catch (err: any) {
      console.error(`SlopGuard internal error during scan: ${err?.message ?? err}`)
      console.error('Run with --verify-integrity=false to skip lockfile checks if that is the issue.')
      process.exit(3)
    }
  }

  if (cmd === 'scan-workspace') {
    try {
      const result = await validateDependencyGraph({
        cwd: process.cwd(),
        recursive: true,
        verifyIntegrity: flags.verifyIntegrity
      })
      if (flags.json) reportJson(result)
      else if (flags.sarif) reportSarif(result)
      else printGraphResult(result)

      if (result.blocked > 0) process.exit(2)
      if (result.warnings > 0 && !flags.ignoreWarnings) process.exit(1)
      process.exit(0)
    } catch (err: any) {
      console.error(`SlopGuard internal error during workspace scan: ${err?.message ?? err}`)
      process.exit(3)
    }
  }

  if (cmd === 'install') {
    const parsed = parseInstallArgs(args.slice(1))
    if (!parsed.args) {
      console.error(`SlopGuard install error: ${parsed.error ?? 'Invalid install arguments'}`)
      console.error('Usage: slopguard install <package[@version]> [--dry-run]')
      process.exit(3)
    }

    try {
      const exitCode = await runProxyInstall({
        ...parsed.args,
        cwd: process.cwd()
      })
      process.exit(exitCode)
    } catch (err: any) {
      console.error(`SlopGuard install error for package "${parsed.args.pkg ?? 'unknown'}": ${err?.message ?? err}`)
      process.exit(3)
    }
  }

  console.error(`Unknown command: "${cmd}". Run "slopguard --help" for usage.`)
  process.exit(3)
}

main().catch(err => {
  console.error(`SlopGuard unexpected error: ${err?.message ?? err}`)
  process.exit(3)
})

function printGraphResult(res: Awaited<ReturnType<typeof validateDependencyGraph>>) {
  console.log(chalk.blue('Recursive scan summary'))
  console.log(`  total: ${res.totalPackages}`)
  console.log(`  scanned: ${res.scannedPackages}`)
  console.log(`  warnings: ${res.warnings}`)
  console.log(`  blocked: ${res.blocked}`)
  console.log(`  depth: ${res.dependencyDepth}`)
  if (res.highRiskPackages.length) {
    console.log(chalk.red(`  high-risk: ${res.highRiskPackages.join(', ')}`))
  }
  if (res.scriptWarnings?.length) {
    console.log(chalk.yellow(`  install scripts: ${res.scriptWarnings.length} warnings`))
  }
}

function printExplainability(res: Awaited<ReturnType<typeof validatePackage>>) {
  const explain = explainResult(res)
  const reasons = explain.reasons.slice(0, 3)
  console.log(`  confidence: ${explain.confidence}`)
  if (reasons.length) {
    console.log(`  reasons: ${reasons.join('; ')}`)
  }
}
