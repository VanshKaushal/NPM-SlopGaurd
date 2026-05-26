import { DependencyGraph } from '../types.js'
import { isSemverRange, pickMaxSatisfying } from './semver.js'

function nodeKey(name: string, version: string) {
  return `${name}@${version}`
}

export function resolveDependencyVersion(
  graph: DependencyGraph,
  name: string,
  range?: string
): string | null {
  const versions: string[] = []
  for (const node of graph.nodes.values()) {
    if (node.name === name) versions.push(node.version)
  }
  if (versions.length === 0) return null
  if (range && isSemverRange(range)) {
    const best = pickMaxSatisfying(versions, range)
    if (best) return best
  }
  return versions[0]
}

export function resolveDependencyNodeId(
  graph: DependencyGraph,
  name: string,
  range?: string
) {
  const version = resolveDependencyVersion(graph, name, range)
  if (!version) return null
  return nodeKey(name, version)
}
