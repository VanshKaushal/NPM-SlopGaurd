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
  return {
    allow: flags.has('--allow'),
    ignoreWarnings: flags.has('--ignore-warnings')
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
  if (args.length === 0 || args[0] === 'help') {
    console.log('Usage: slopguard check <pkg[@version]>')
    console.log('       slopguard scan')
    console.log('       slopguard scan --recursive')
    console.log('       slopguard scan-workspace')
    console.log('       slopguard install <pkg[@version]> [--dry-run]')
    process.exit(0)
  }

  const cmd = args[0]
  const flags = parseFlags(args)
  const baseConfig = await loadConfig()

  if (cmd === 'check' && args[1]) {
    const pkg = args[1]
    console.log(chalk.blue(`Validating ${pkg}...`))
    const cfg = mergeConfig({ ...baseConfig, allowlist: flags.allow ? [pkg] : baseConfig.allowlist })
    const res = await validatePackage(pkg, cfg)
    printResult(pkg, res)
    if (res.hardBlocked) process.exit(1)
    if (!flags.ignoreWarnings && res.score < 75) process.exit(2)
    process.exit(0)
  }

  if (cmd === 'scan') {
    if (args.includes('--recursive')) {
      const result = await validateDependencyGraph({
        cwd: process.cwd(),
        recursive: false
      })
      printGraphResult(result)
      process.exit(result.blocked > 0 ? 1 : result.warnings > 0 ? 2 : 0)
    } else {
      const packages = await scanPackageJson(process.cwd())
      const limit = createLimiter(10)
      let exitCode = 0
      for (const pkg of packages) {
        const res = await limit(() => validatePackage(pkg, baseConfig))
        printResult(pkg, res)
        if (res.hardBlocked) exitCode = 1
        else if (res.score < 75) exitCode = Math.max(exitCode, 2)
      }
      process.exit(exitCode)
    }
  }

  if (cmd === 'scan-workspace') {
    const result = await validateDependencyGraph({
      cwd: process.cwd(),
      recursive: true
    })
    printGraphResult(result)
    process.exit(result.blocked > 0 ? 1 : result.warnings > 0 ? 2 : 0)
  }

  if (cmd === 'install') {
    const parsed = parseInstallArgs(args.slice(1))
    if (!parsed.args) {
      console.error(parsed.error ?? 'Invalid install arguments')
      process.exit(1)
    }

    const exitCode = await runProxyInstall({
      ...parsed.args,
      cwd: process.cwd()
    })
    process.exit(exitCode)
  }

  console.log('Unknown command')
  process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
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
