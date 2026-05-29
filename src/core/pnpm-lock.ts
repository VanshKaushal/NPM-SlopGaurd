import fs from 'fs'
import { parse as parseYaml } from 'yaml'
import { DependencyGraph, DependencyNode } from '../types.js'

function nodeKey(name: string, version: string) {
  return `${name}@${version}`
}

function parsePackageKey(key: string): { name: string; version: string } | null {
  if (!key.startsWith('/')) return null
  const trimmed = key.slice(1)
  const at = trimmed.lastIndexOf('@')
  if (at <= 0) return null
  const name = trimmed.slice(0, at)
  const version = trimmed.slice(at + 1).split('(')[0]
  if (!name || !version) return null
  return { name, version }
}

function toDependencyNode(
  name: string,
  version: string,
  data: any
): DependencyNode {
  const deps = new Map<string, string>()
  const depBlocks = [data?.dependencies, data?.optionalDependencies, data?.devDependencies]
  for (const block of depBlocks) {
    if (!block || typeof block !== 'object') continue
    for (const [dep, range] of Object.entries(block)) {
      if (typeof range === 'string') deps.set(dep, range)
    }
  }
  
  let realName = name
  let realVersion = version
  let alias: string | undefined = undefined
  
  // pnpm lockfile stores the alias in the version or resolution sometimes
  const resolution = data?.resolution?.tarball || data?.resolution?.integrity || ''
  const id = data?.id || ''
  
  // Actually, pnpm lockfile packages key is already the real name (e.g. /lodash/4.17.21)
  // But if there's an alias, pnpm uses "name" field inside the object to denote real name.
  if (data?.name && data.name !== name) {
    alias = name
    realName = data.name
    realVersion = data.version || version
  }

  return {
    name: realName,
    version: realVersion,
    alias,
    dependencies: deps,
    integrity: data?.resolution?.integrity,
    resolved: data?.resolution?.tarball,
    dev: Boolean(data?.dev),
    optional: Boolean(data?.optional)
  }
}

export function parsePnpmLock(filePath: string): DependencyGraph {
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = parseYaml(raw) as any

  const nodes = new Map<string, DependencyNode>()
  const roots: string[] = []

  const packages = data?.packages ?? {}
  for (const [key, value] of Object.entries(packages)) {
    const parsed = parsePackageKey(key)
    if (!parsed) continue
    const node = toDependencyNode(parsed.name, parsed.version, value)
    nodes.set(nodeKey(node.name, node.version), node)
  }

  const importers = data?.importers ?? {}
  for (const importer of Object.values(importers)) {
    if (!importer || typeof importer !== 'object') continue
    const deps = {
      ...(importer as any).dependencies,
      ...(importer as any).optionalDependencies,
      ...(importer as any).devDependencies
    }
    for (const [name, ref] of Object.entries(deps)) {
      if (typeof ref !== 'string') continue
      const resolved = resolveRefVersion(ref)
      if (!resolved) continue
      roots.push(nodeKey(name, resolved))
    }
  }

  return { nodes, roots }
}

function resolveRefVersion(ref: string) {
  if (!ref) return null
  if (ref.startsWith('link:') || ref.startsWith('workspace:')) return null
  const parts = ref.split('/')
  const last = parts[parts.length - 1]
  if (!last) return null
  return last.replace(/^\^/, '').split('(')[0]
}
