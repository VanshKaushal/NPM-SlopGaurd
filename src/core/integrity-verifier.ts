import chalk from 'chalk'
import { getPackageMetadata } from './registry.js'
import { DependencyGraph, DependencyNode } from '../types.js'
import { LockfileType } from './lockfiles.js'

export async function verifyLockfileIntegrity(
  graph: DependencyGraph,
  lockfileType: LockfileType | undefined,
  offline: boolean = false,
  deep: boolean = false
): Promise<void> {
  const verifiedNodes = new Set<string>()
  const queue: { id: string, depth: number }[] = graph.roots.map(id => ({ id, depth: 0 }))
  
  const cache = new Map<string, string | undefined>()
  
  while (queue.length > 0) {
    const current = queue.shift()!
    if (verifiedNodes.has(current.id)) continue
    verifiedNodes.add(current.id)
    
    // Performance constraint: direct + 1 level deep by default
    if (!deep && current.depth > 1) continue
    
    const node = graph.nodes.get(current.id)
    if (!node) continue
    
    // Step 1: URL Verification
    if (!offline && node.resolved) {
      try {
        const url = new URL(node.resolved)
        const host = url.hostname
        if (host !== 'registry.npmjs.org' && host !== 'registry.yarnpkg.com') {
          console.warn(chalk.yellow(`Warning: Non-registry resolved URL for ${node.name}@${node.version}: ${node.resolved}`))
        }
        if (host === 'github.com' || host === 'raw.githubusercontent.com') {
          console.warn(chalk.yellow(`Warning: Raw GitHub URL resolved for ${node.name}@${node.version}: ${node.resolved}`))
        }
        if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host)) {
          console.warn(chalk.yellow(`Warning: IP address resolved for ${node.name}@${node.version}: ${node.resolved}`))
        }
        if (host === 'localhost' || host === '127.0.0.1') {
          console.warn(chalk.yellow(`Warning: Localhost URL resolved for ${node.name}@${node.version}: ${node.resolved}`))
        }
      } catch (e) {
        // invalid URL
      }
    }
    
    // Step 2 & 4: Integrity Hash Cross-Verification
    if (node.integrity) {
      if (offline) {
        console.warn(chalk.yellow(`Warning: Cannot verify integrity for ${node.name}@${node.version} in offline mode (UNVERIFIABLE)`))
      } else {
        let registryIntegrity = cache.get(`${node.name}@${node.version}`)
        if (!cache.has(`${node.name}@${node.version}`)) {
          const meta = await getPackageMetadata(node.name)
          registryIntegrity = meta?.versions?.[node.version]?.dist?.integrity
          cache.set(`${node.name}@${node.version}`, registryIntegrity)
        }
        
        if (registryIntegrity && node.integrity !== registryIntegrity) {
          console.error(chalk.red(`CRITICAL: Lockfile integrity mismatch for ${node.name}@${node.version}. Possible lockfile poisoning attack.`))
          process.exit(2)
        }
      }
    }
    
    for (const depId of node.dependencies.values()) {
      queue.push({ id: depId, depth: current.depth + 1 })
    }
  }
}
