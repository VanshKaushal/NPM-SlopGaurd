import path from 'path'
import { createLimiter } from './concurrency.js'
import { detectLockfile, parseLockfile } from './lockfiles.js'
import { readManifest } from './manifests.js'
import { discoverWorkspaces } from './workspaces.js'
import { resolveDependencyNodeId } from './resolver.js'
import { analyzeInstallScripts } from './install-scripts.js'
import { validatePackage } from './validator.js'
import {
  DependencyGraph,
  DependencyNode,
  GraphValidationResult,
  ValidationResult
} from '../types.js'

export type GraphOptions = {
  cwd: string
  recursive: boolean
  depthLimit?: number
  concurrency?: number
  includeDev?: boolean
  includeOptional?: boolean
  includePeer?: boolean
  offline?: boolean
}

type QueueEntry = {
  id: string
  depth: number
}

function nodeKey(name: string, version: string) {
  return `${name}@${version}`
}

function buildRootDeps(
  manifests: Array<{ file: string; data: ReturnType<typeof readManifest> }>,
  options: GraphOptions
) {
  const roots = new Map<string, string>()
  for (const entry of manifests) {
    const data = entry.data
    if (!data) continue
    for (const [name, range] of Object.entries(data.dependencies)) roots.set(name, range)
    if (options.includeOptional) {
      for (const [name, range] of Object.entries(data.optionalDependencies)) roots.set(name, range)
    }
    if (options.includeDev) {
      for (const [name, range] of Object.entries(data.devDependencies)) roots.set(name, range)
    }
    if (options.includePeer) {
      for (const [name, range] of Object.entries(data.peerDependencies)) roots.set(name, range)
    }
  }
  return roots
}

function createPseudoNode(name: string, range: string): DependencyNode {
  return {
    name,
    version: range,
    dependencies: new Map()
  }
}

function appendRootNodes(
  graph: DependencyGraph,
  rootDeps: Map<string, string>
): string[] {
  const rootIds = new Set(graph.roots)
  for (const [name, range] of rootDeps.entries()) {
    const resolved = resolveDependencyNodeId(graph, name, range)
    if (resolved) rootIds.add(resolved)
    else rootIds.add(nodeKey(name, range))
  }
  return Array.from(rootIds)
}

function getNodeById(
  graph: DependencyGraph,
  id: string
): DependencyNode | null {
  const node = graph.nodes.get(id)
  if (node) return node
  const at = id.lastIndexOf('@')
  if (at <= 0) return null
  const name = id.slice(0, at)
  const version = id.slice(at + 1)
  return createPseudoNode(name, version)
}

export async function validateDependencyGraph(options: GraphOptions): Promise<GraphValidationResult> {
  const workspace = options.recursive ? discoverWorkspaces(options.cwd) : {
    rootDir: options.cwd,
    packageJsonFiles: [path.join(options.cwd, 'package.json')]
  }

  const manifestEntries = workspace.packageJsonFiles
    .map(file => ({ file, data: readManifest(file) }))
    .filter((entry): entry is { file: string; data: NonNullable<ReturnType<typeof readManifest>> } => Boolean(entry.data))

  const rootDeps = buildRootDeps(manifestEntries, options)

  const scriptWarnings: NonNullable<GraphValidationResult['scriptWarnings']> = []
  for (const entry of manifestEntries) {
    const risks = analyzeInstallScripts(entry.data?.scripts)
    for (const risk of risks) {
      scriptWarnings.push({
        pkg: entry.data?.name ?? path.dirname(entry.file),
        script: risk.script,
        level: risk.level,
        reason: risk.reason
      })
    }
  }

  const lockfile = detectLockfile(workspace.rootDir)
  const parsedGraph = lockfile ? parseLockfile(lockfile) : null
  const graph: DependencyGraph = parsedGraph ?? { nodes: new Map(), roots: [] }

  const roots = appendRootNodes(graph, rootDeps)
  const queue: QueueEntry[] = roots.map(id => ({ id, depth: 0 }))
  const visited = new Set<string>()
  const results: ValidationResult[] = []

  const limit = createLimiter(options.concurrency ?? 12)
  let maxDepth = 0
  let blocked = 0
  let warnings = 0

  while (queue.length) {
    const current = queue.shift()!
    if (visited.has(current.id)) continue
    visited.add(current.id)
    maxDepth = Math.max(maxDepth, current.depth)

    const node = getNodeById(graph, current.id)
    if (!node) continue

    const spec = node.version ? `${node.name}@${node.version}` : node.name
    const result = await limit(() => validatePackage(spec, { offline: options.offline }))
    results.push(result)

    if (result.hardBlocked) blocked += 1
    if (result.score < 75) warnings += 1

    if (options.depthLimit !== undefined && current.depth >= options.depthLimit) continue

    for (const [dep, range] of node.dependencies.entries()) {
      const depId = resolveDependencyNodeId(graph, dep, range) ?? nodeKey(dep, range)
      if (!visited.has(depId)) queue.push({ id: depId, depth: current.depth + 1 })
    }
  }

  const highRiskPackages = results
    .filter(res => res.hardBlocked || res.score < 50)
    .map(res => res.pkg)

  return {
    totalPackages: roots.length ? graph.nodes.size || roots.length : graph.nodes.size,
    scannedPackages: results.length,
    warnings,
    blocked,
    skipped: Math.max(0, (graph.nodes.size || roots.length) - results.length),
    dependencyDepth: maxDepth,
    highRiskPackages,
    results,
    scriptWarnings
  }
}
