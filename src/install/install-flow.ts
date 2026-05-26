import chalk from 'chalk'
import { validatePackage } from '../core/validator.js'
import { loadConfig, mergeConfig } from '../core/config.js'
import { validateDependencyGraph } from '../core/graph.js'
import { explainResult } from '../core/explainability.js'
import { detectPackageManager } from './detect-manager.js'
import { spawnCommand } from './spawn.js'
import { parsePackageSpec } from './args.js'
import { buildNpmInstallCommand } from './npm.js'
import { buildPnpmInstallCommand } from './pnpm.js'
import { buildYarnInstallCommand } from './yarn.js'
import { PackageManager } from './args.js'
import { loadPolicyBundle } from '../mcp/policy-loader.js'
import { enforcePolicy } from '../mcp/enforcement.js'
import { getAgentContext } from '../mcp/agent-context.js'

export type InstallFlowOptions = {
  pkg: string
  allow: boolean
  ignoreWarnings: boolean
  manager?: PackageManager
  offline: boolean
  dryRun: boolean
  cwd: string
}

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
}

function printPolicyDecision(decision: ReturnType<typeof enforcePolicy>['decision'], mode: string) {
  const actionColor = decision.action === 'block'
    ? chalk.red
    : decision.action === 'warn'
      ? chalk.yellow
      : chalk.green
  console.log(`${chalk.gray('policy')}: ${mode}`)
  console.log(`${chalk.gray('decision')}: ${actionColor(decision.action)} (${decision.confidence} confidence)`)
  if (decision.reasons.length) {
    const reasons = decision.reasons.slice(0, 3)
    console.log(`${chalk.gray('reasons')}: ${reasons.join('; ')}`)
  }
  if (decision.overridesApplied.length) {
    console.log(`${chalk.gray('overrides')}: ${decision.overridesApplied.join(', ')}`)
  }
}

function printGraphPreview(graph: Awaited<ReturnType<typeof validateDependencyGraph>>) {
  console.log(chalk.blue('Dry-run graph preview'))
  console.log(`  total: ${graph.totalPackages}`)
  console.log(`  scanned: ${graph.scannedPackages}`)
  console.log(`  warnings: ${graph.warnings}`)
  console.log(`  blocked: ${graph.blocked}`)
  console.log(`  depth: ${graph.dependencyDepth}`)
  if (graph.highRiskPackages.length) {
    console.log(chalk.red(`  high-risk: ${graph.highRiskPackages.slice(0, 6).join(', ')}`))
  }
  if (graph.scriptWarnings?.length) {
    console.log(chalk.yellow(`  install scripts: ${graph.scriptWarnings.length} warnings`))
  }
}

function buildInstallCommand(manager: PackageManager, pkg: string, offline: boolean) {
  if (manager === 'pnpm') return buildPnpmInstallCommand({ pkg, offline })
  if (manager === 'yarn') return buildYarnInstallCommand({ pkg, offline })
  return buildNpmInstallCommand({ pkg, offline })
}

export async function runInstallFlow(options: InstallFlowOptions): Promise<number> {
  const spec = parsePackageSpec(options.pkg)
  const baseConfig = await loadConfig(options.cwd)
  const config = mergeConfig({
    ...baseConfig,
    offline: options.offline,
    allowlist: options.allow ? [spec.name] : baseConfig.allowlist
  })

  const policyBundle = loadPolicyBundle(options.cwd)
  const agentContext = getAgentContext()
  const graph = await validateDependencyGraph({
    cwd: options.cwd,
    recursive: true,
    offline: options.offline
  })

  const result = await validatePackage(options.pkg, config)
  const overrides = options.allow
    ? [...policyBundle.overrides, { name: spec.name, action: 'allow', reason: 'cli --allow' }]
    : policyBundle.overrides

  printResult(options.pkg, result)
  console.log(`  confidence: ${explainResult(result).confidence}`)

  const enforcement = enforcePolicy({
    pkg: spec.name,
    result,
    policy: policyBundle.policy,
    allowlist: policyBundle.allowlist,
    blocklist: policyBundle.blocklist,
    overrides,
    graph,
    ignoreWarnings: options.ignoreWarnings,
    nonInteractive: agentContext.nonInteractive,
    dryRun: options.dryRun,
    degraded: options.offline
  })

  printPolicyDecision(enforcement.decision, policyBundle.mode)

  if (options.dryRun) {
    printGraphPreview(graph)
    console.log(chalk.gray('Dry run: install skipped'))
    return enforcement.enforcement.exitCode
  }

  if (!enforcement.enforcement.shouldInstall) {
    return enforcement.enforcement.exitCode
  }

  const detected = detectPackageManager(options.cwd, options.manager)
  const command = buildInstallCommand(detected.manager, options.pkg, options.offline)
  const installExit = await spawnCommand(command.command, command.args, { cwd: options.cwd })
  return Math.max(installExit, enforcement.enforcement.exitCode)
}
