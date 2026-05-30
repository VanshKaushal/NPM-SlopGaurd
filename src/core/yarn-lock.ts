import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import pkg from '@yarnpkg/lockfile'
const parseSyml = pkg.parse || (pkg as any).default?.parse
// import { parse as parseSyml } from '@yarnpkg/lockfile'
export type LockFileEntry = any
import { parse as parseYaml } from 'yaml'
import { DependencyGraph, DependencyNode } from '../types.js'

function nodeKey(name: string, version: string) {
  return `${name}@${version}`
}

function extractNameVersion(key: string) {
  const at = key.lastIndexOf('@')
  if (at > 0) {
    return { name: key.slice(0, at), requested: key.slice(at + 1) }
  }
  return { name: key, requested: '' }
}

export function parseYarnLock(filePath: string): DependencyGraph {
  const raw = fs.readFileSync(filePath, 'utf8')
  const nodes = new Map<string, DependencyNode>()
  const roots: string[] = []
  
  if (raw.trim() === '') {
    throw new Error(`Failed to parse yarn.lock: Lockfile is empty. Ensure you are running SlopGuard in a project with a valid, non-empty yarn.lock file.`)
  }

  // Detect PnP Mode
  const rootDir = path.dirname(filePath)
  if (fs.existsSync(path.join(rootDir, '.pnp.cjs')) || fs.existsSync(path.join(rootDir, '.pnp.loader.mjs'))) {
    console.warn(chalk.yellow("Yarn PnP detected. Dependency graph may be incomplete. Full PnP support is in progress."))
  }

  let isBerry = false
  let parsed: any = null
  
  try {
    parsed = parseYaml(raw)
    if (parsed && parsed.__metadata && parsed.__metadata.cacheKey !== undefined) {
      isBerry = true
    }
  } catch (e) {
    // not valid yaml, definitely classic
  }

  if (isBerry) {
    // Path B (Yarn Berry)
    for (const [pkgKey, rawEntry] of Object.entries(parsed)) {
      if (pkgKey === '__metadata') continue
      
      const entry = rawEntry as LockFileEntry
      
      const keys = pkgKey.split(',').map(k => k.trim())
      
      for (const key of keys) {
        let name = ''
        const firstAt = key.indexOf('@', 1)
        if (firstAt > 0) {
           name = key.slice(0, firstAt)
        } else {
           name = key
        }
        
        let realName = name
        let realVersion = entry.version
        let alias: string | undefined = undefined
        
        // npm:alias resolution in Berry
        const resolution = entry.resolution || ''
        if (resolution.includes('npm:')) {
           const match = resolution.match(/npm:([^@]+)@/)
           if (match) {
             alias = name
             realName = match[1]
           }
        }
        
        const node: DependencyNode = {
          name: realName,
          version: realVersion,
          alias,
          dependencies: new Map(Object.entries(entry.dependencies || {}) as [string, string][]),
          integrity: entry.checksum,
          resolved: resolution
        }
        
        nodes.set(nodeKey(node.name, node.version), node)
      }
    }
  } else {
    // Path A (Yarn Classic)
    const result = parseSyml(raw)
    if (result.type !== 'success') {
      throw new Error(`Failed to parse yarn.lock: Invalid Yarn classic lockfile format. Ensure your yarn.lock is valid and not corrupted.`)
    }
    const data = result.object
    for (const [pkgKey, rawEntry] of Object.entries(data)) {
      const entry = rawEntry as LockFileEntry
      const keys = pkgKey.split(',').map(k => k.trim())
      for (const key of keys) {
        let name = ''
        const firstAt = key.indexOf('@', 1)
        if (firstAt > 0) {
           name = key.slice(0, firstAt)
        } else {
           name = key
        }
        
        let realName = name
        let realVersion = entry.version
        let alias: string | undefined = undefined
        
        // npm:alias resolution in Classic
        if (entry.resolved && entry.resolved.includes('npm:')) {
           // Not standard for v1, but fulfilling the prompt
           const match = entry.resolved.match(/npm:([^@]+)@/)
           if (match) {
             alias = name
             realName = match[1]
           }
        }

        const node: DependencyNode = {
          name: realName,
          version: realVersion,
          alias,
          dependencies: new Map(Object.entries(entry.dependencies || {}) as [string, string][]),
          integrity: entry.integrity,
          resolved: entry.resolved
        }
        
        nodes.set(nodeKey(node.name, node.version), node)
      }
    }
  }

  if (nodes.size === 0) {
    throw new Error(`Failed to parse yarn.lock: Zero packages resolved. Check if the lockfile contains valid dependencies or needs to be regenerated.`)
  }

  return { nodes, roots }
}
