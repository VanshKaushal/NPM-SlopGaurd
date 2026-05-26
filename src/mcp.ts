#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { validatePackage } from './core/validator.js'
import { createLimiter } from './core/concurrency.js'
import { detectLockfile, parseLockfile } from './core/lockfiles.js'
import { validateDependencyGraph } from './core/graph.js'
import { explainResult } from './core/explainability.js'
import { loadPolicyBundle } from './mcp/policy-loader.js'
import { evaluatePolicy } from './mcp/policy-engine.js'
import { enforcePolicy } from './mcp/enforcement.js'
import { getAgentContext } from './mcp/agent-context.js'
import { parsePackageSpec } from './install/args.js'
import { detectPackageManager } from './install/detect-manager.js'
import { buildNpmInstallCommand } from './install/npm.js'
import { buildPnpmInstallCommand } from './install/pnpm.js'
import { buildYarnInstallCommand } from './install/yarn.js'
import { spawnCommand } from './install/spawn.js'

const checkInput = {
  package: z.string().min(1),
  allow: z.boolean().optional(),
  ignoreWarnings: z.boolean().optional()
}

const scanInput = {
  cwd: z.string().optional()
}

const scanWorkspaceInput = {
  cwd: z.string().optional(),
  offline: z.boolean().optional()
}

const lockfileInput = {
  cwd: z.string().optional()
}

const policyInput = {
  package: z.string().min(1),
  cwd: z.string().optional(),
  offline: z.boolean().optional()
}

const installInput = {
  package: z.string().min(1),
  cwd: z.string().optional(),
  allow: z.boolean().optional(),
  ignoreWarnings: z.boolean().optional(),
  offline: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  execute: z.boolean().optional()
}

function scanPackageJson(cwd: string) {
  const file = path.resolve(cwd, 'package.json')
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw) as any
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.optionalDependencies }
  return Object.keys(deps)
}

async function main() {
  const server = new McpServer({
    name: 'slopguard',
    version: '0.1.0'
  })

  server.registerTool('check_package', {
    description: 'Validate a single npm package using SlopGuard signals',
    inputSchema: checkInput
  }, async params => {
    const parsed = z.object(checkInput).parse(params)
    const res = await validatePackage(parsed.package, {
      allowlist: parsed.allow ? [parsed.package] : []
    })
    return {
      content: [{ type: 'text', text: JSON.stringify({ result: res, explain: explainResult(res) }) }]
    }
  })

  server.registerTool('scan_package_json', {
    description: 'Scan package.json dependencies in a folder',
    inputSchema: scanInput
  }, async params => {
    const parsed = z.object(scanInput).parse(params)
    const cwd = parsed.cwd ?? process.cwd()
    const pkgs = scanPackageJson(cwd)
    const limit = createLimiter(10)
    const results = []
    for (const pkg of pkgs) {
      const result = await limit(() => validatePackage(pkg))
      results.push({ result, explain: explainResult(result) })
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ count: results.length, results }) }]
    }
  })

  server.registerTool('scan_workspace', {
    description: 'Recursively scan a workspace dependency graph',
    inputSchema: scanWorkspaceInput
  }, async params => {
    const parsed = z.object(scanWorkspaceInput).parse(params)
    const cwd = parsed.cwd ?? process.cwd()
    const result = await validateDependencyGraph({ cwd, recursive: true, offline: parsed.offline })
    const policyBundle = loadPolicyBundle(cwd)
    const decisions = result.results.map(res => ({
      pkg: res.pkg,
      decision: evaluatePolicy({
        pkg: res.pkg,
        result: res,
        policy: policyBundle.policy,
        allowlist: policyBundle.allowlist,
        blocklist: policyBundle.blocklist,
        overrides: policyBundle.overrides,
        graph: result,
        degraded: parsed.offline
      })
    }))
    return {
      content: [{ type: 'text', text: JSON.stringify({
        result,
        policyMode: policyBundle.mode,
        decisions,
        explain: result.results.map(r => ({ pkg: r.pkg, explain: explainResult(r) }))
      }) }]
    }
  })

  server.registerTool('evaluate_policy', {
    description: 'Evaluate a package against the workspace policy',
    inputSchema: policyInput
  }, async params => {
    const parsed = z.object(policyInput).parse(params)
    const cwd = parsed.cwd ?? process.cwd()
    const spec = parsePackageSpec(parsed.package)
    const result = await validatePackage(parsed.package, { offline: parsed.offline })
    const policyBundle = loadPolicyBundle(cwd)
    const decision = evaluatePolicy({
      pkg: spec.name,
      result,
      policy: policyBundle.policy,
      allowlist: policyBundle.allowlist,
      blocklist: policyBundle.blocklist,
      overrides: policyBundle.overrides,
      degraded: parsed.offline
    })
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          result,
          decision,
          policyMode: policyBundle.mode,
          explain: explainResult(result)
        })
      }]
    }
  })

  server.registerTool('install_package', {
    description: 'Policy-mediated package installation for agents and CI',
    inputSchema: installInput
  }, async params => {
    const parsed = z.object(installInput).parse(params)
    const cwd = parsed.cwd ?? process.cwd()
    const spec = parsePackageSpec(parsed.package)
    const policyBundle = loadPolicyBundle(cwd)
    const agentContext = getAgentContext()
    const graph = await validateDependencyGraph({
      cwd,
      recursive: true,
      offline: parsed.offline
    })
    const result = await validatePackage(parsed.package, { offline: parsed.offline })
    const overrides = parsed.allow
      ? [...policyBundle.overrides, { name: spec.name, action: 'allow', reason: 'mcp allow' }]
      : policyBundle.overrides

    const enforcement = enforcePolicy({
      pkg: spec.name,
      result,
      policy: policyBundle.policy,
      allowlist: policyBundle.allowlist,
      blocklist: policyBundle.blocklist,
      overrides,
      graph,
      ignoreWarnings: parsed.ignoreWarnings ?? false,
      nonInteractive: agentContext.nonInteractive,
      dryRun: parsed.dryRun ?? true,
      degraded: parsed.offline
    })

    let installExit: number | null = null
    if ((parsed.execute ?? false) && enforcement.enforcement.shouldInstall) {
      const detected = detectPackageManager(cwd)
      const command = detected.manager === 'pnpm'
        ? buildPnpmInstallCommand({ pkg: parsed.package, offline: Boolean(parsed.offline) })
        : detected.manager === 'yarn'
          ? buildYarnInstallCommand({ pkg: parsed.package, offline: Boolean(parsed.offline) })
          : buildNpmInstallCommand({ pkg: parsed.package, offline: Boolean(parsed.offline) })

      installExit = await spawnCommand(command.command, command.args, { cwd })
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          policyMode: policyBundle.mode,
          decision: enforcement.decision,
          enforcement: enforcement.enforcement,
          installExit,
          explain: explainResult(result)
        })
      }]
    }
  })

  server.registerTool('validate_lockfile', {
    description: 'Parse and validate a workspace lockfile',
    inputSchema: lockfileInput
  }, async params => {
    const parsed = z.object(lockfileInput).parse(params)
    const cwd = parsed.cwd ?? process.cwd()
    const lockfile = detectLockfile(cwd)
    if (!lockfile) {
      return { content: [{ type: 'text', text: JSON.stringify({ found: false }) }] }
    }
    const graph = parseLockfile(lockfile)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          found: true,
          type: lockfile.type,
          path: lockfile.path,
          nodes: graph?.nodes.size ?? 0,
          roots: graph?.roots.length ?? 0
        })
      }]
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
