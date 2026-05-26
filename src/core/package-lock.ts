import fs from 'fs'
import { DependencyGraph, DependencyNode } from '../types.js'

function nodeKey(name: string, version: string) {
  return `${name}@${version}`
}

function toDependencyNode(
  name: string,
  version: string,
  data: any
): DependencyNode {
  const deps = new Map<string, string>()
  const dependencies = data?.dependencies ?? {}
  for (const [dep, range] of Object.entries(dependencies)) {
    if (typeof range === 'string') deps.set(dep, range)
  }
  return {
    name,
    version,
    dependencies: deps,
    integrity: data?.integrity,
    resolved: data?.resolved,
    dev: Boolean(data?.dev),
    optional: Boolean(data?.optional)
  }
}

export function parsePackageLock(filePath: string): DependencyGraph {
  const raw = fs.readFileSync(filePath, 'utf8')
  const json = JSON.parse(raw) as any

  const nodes = new Map<string, DependencyNode>()
  const roots: string[] = []

  const packages = json?.packages ?? null

  if (packages && typeof packages === 'object') {
    for (const [pkgPath, data] of Object.entries(packages)) {
      if (!data || typeof data !== 'object') continue
      if (pkgPath === '') continue
      const name = (data as any).name ?? null
      const version = (data as any).version ?? null
      if (!name || !version) continue
      const node = toDependencyNode(name, version, data)
      nodes.set(nodeKey(name, version), node)
    }

    const root = packages[''] ?? {}
    const rootDeps = {
      ...(root?.dependencies ?? {}),
      ...(root?.optionalDependencies ?? {}),
      ...(root?.devDependencies ?? {})
    }

    for (const depName of Object.keys(rootDeps)) {
      const depPath = `node_modules/${depName}`
      const entry = packages[depPath]
      if (!entry?.version) continue
      roots.push(nodeKey(depName, entry.version))
    }

    return { nodes, roots }
  }

  const dependencies = json?.dependencies ?? {}
  for (const [name, data] of Object.entries(dependencies)) {
    if (!data || typeof data !== 'object') continue
    const version = (data as any).version
    if (!version) continue
    const node = toDependencyNode(name, version, data)
    nodes.set(nodeKey(name, version), node)
    roots.push(nodeKey(name, version))
  }

  return { nodes, roots }
}
