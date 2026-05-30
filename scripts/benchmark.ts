import { execSync } from 'child_process'
import { performance } from 'perf_hooks'
import os from 'os'

interface BenchmarkResult {
  name: string
  fixture: string
  durationMs: number
  packageCount: number
  msPerPackage: number
}

const targets = [
  { name: 'single-package', fixture: 'tests/fixtures/clean-package', estimatedPackages: 1 },
  { name: 'monorepo', fixture: 'tests/fixtures/monorepo', estimatedPackages: 10 }
]

const results: BenchmarkResult[] = []

console.log('SlopGuard Performance Benchmark')
console.log('=================================')
console.log(`Host: ${os.hostname()}`)
console.log(`OS: ${os.platform()} ${os.release()}`)
console.log(`CPU: ${os.cpus()[0]?.model ?? 'unknown'} (${os.cpus().length} cores)`)
console.log(`Node: ${process.version}`)
console.log('')

for (const target of targets) {
  const fs = await import('fs')
  const fixtureExists = fs.existsSync(target.fixture)

  if (!fixtureExists) {
    console.log(`\u26a0  Skipping ${target.name}: fixture not found at ${target.fixture}`)
    continue
  }

  process.stdout.write(`Running ${target.name}... `)
  const start = performance.now()

  try {
    execSync(`node dist/src/cli.js scan`, {
      cwd: target.fixture,
      stdio: 'pipe',
      timeout: 30000
    })
  } catch (_e) {
    // exit code != 0 is fine for benchmarking (blocked packages)
  }

  const durationMs = performance.now() - start
  const msPerPackage = durationMs / target.estimatedPackages

  results.push({
    name: target.name,
    fixture: target.fixture,
    durationMs,
    packageCount: target.estimatedPackages,
    msPerPackage
  })

  console.log(`${durationMs.toFixed(0)}ms (${msPerPackage.toFixed(0)}ms/pkg)`)
}

if (results.length > 0) {
  console.log('')
  console.log('Results:')
  console.log('| Target | Packages | Duration | Per-package |')
  console.log('|---|---|---|---|')
  for (const r of results) {
    console.log(`| ${r.name} | ${r.packageCount} | ${r.durationMs.toFixed(0)}ms | ${r.msPerPackage.toFixed(0)}ms |`)
  }
}

console.log('')
console.log('SLA Targets (Alpha):')
console.log('| Package count | Max allowed duration |')
console.log('|---|---|')
console.log('| 1-10 | < 5 seconds |')
console.log('| 11-100 | < 30 seconds |')
console.log('| 101-500 | < 120 seconds |')
console.log('| 500+ | < 300 seconds |')
