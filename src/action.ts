#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { validatePackage } from './core/validator.js'
import { createLimiter } from './core/concurrency.js'
import { detectLockfile } from './core/lockfiles.js'
import { validateDependencyGraph } from './core/graph.js'
import { explainResult } from './core/explainability.js'

type Mode = 'warn' | 'block'

function getInput(name: string, fallback?: string) {
  const key = `INPUT_${name.replace(/\s+/g, '_').toUpperCase()}`
  return process.env[key] ?? fallback
}

function isDir(p: string) {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

function findPackageJsonFiles(root: string) {
  const results: string[] = []
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()!
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile() && entry.name === 'package.json') {
        results.push(full)
      }
    }
  }
  return results
}

function readPackages(file: string) {
  const raw = fs.readFileSync(file, 'utf8')
  const json = JSON.parse(raw) as any
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.optionalDependencies }
  return Object.keys(deps)
}

function annotate(level: 'warning' | 'error', msg: string) {
  console.log(`::${level}::${msg}`)
}

async function main() {
  const mode = (getInput('mode', 'warn') as Mode) || 'warn'
  const rootInput = getInput('path', '.')
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd()
  const root = path.resolve(workspace, rootInput ?? '.')
  const maxConcurrency = Number(getInput('concurrency', '10')) || 10

  const lockfile = detectLockfile(root)
  if (lockfile) {
    const graph = await validateDependencyGraph({
      cwd: root,
      recursive: true,
      concurrency: maxConcurrency
    })

    let exitCode = 0
    for (const result of graph.results) {
      const explain = explainResult(result)
      if (result.hardBlocked) {
        annotate('error', `SlopGuard blocked ${result.pkg} (confidence: ${explain.confidence})`)
        exitCode = 1
        continue
      }
      if (result.score < 75) {
        annotate('warning', `SlopGuard warning for ${result.pkg} (score ${result.score}, confidence: ${explain.confidence})`)
        if (mode === 'block') exitCode = Math.max(exitCode, 1)
        else exitCode = Math.max(exitCode, 2)
      }
    }

    process.exit(exitCode)
  }

  const packageFiles = isDir(root) ? findPackageJsonFiles(root) : [root]
  const uniquePackages = new Set<string>()
  for (const file of packageFiles) {
    for (const pkg of readPackages(file)) uniquePackages.add(pkg)
  }

  const limit = createLimiter(maxConcurrency)
  let exitCode = 0

  for (const pkg of uniquePackages) {
    const res = await limit(() => validatePackage(pkg))
    const explain = explainResult(res)
    if (res.hardBlocked) {
      annotate('error', `SlopGuard blocked ${pkg} (confidence: ${explain.confidence})`)
      exitCode = 1
      continue
    }
    if (res.score < 75) {
      annotate('warning', `SlopGuard warning for ${pkg} (score ${res.score}, confidence: ${explain.confidence})`)
      if (mode === 'block') exitCode = Math.max(exitCode, 1)
      else exitCode = Math.max(exitCode, 2)
    }
  }

  process.exit(exitCode)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
