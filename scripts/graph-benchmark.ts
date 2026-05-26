import { validateDependencyGraph } from '../src/core/graph.js'
import { benchmark } from '../src/core/benchmark.js'

async function run() {
  const { result, durationMs } = await benchmark(() => validateDependencyGraph({
    cwd: process.cwd(),
    recursive: true
  }))

  console.log(JSON.stringify({
    durationMs,
    totalPackages: result.totalPackages,
    scannedPackages: result.scannedPackages,
    depth: result.dependencyDepth
  }, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
