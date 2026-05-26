import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'
import { benchmark } from '../src/core/benchmark.js'
import { metrics } from '../src/core/metrics.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

async function run() {
  const pkgs = loadDataset('legit-packages.json')
  const timings: number[] = []
  for (const pkg of pkgs) {
    const { durationMs } = await benchmark(() => validatePackage(pkg))
    timings.push(durationMs)
  }

  const avg = timings.reduce((a, b) => a + b, 0) / (timings.length || 1)
  const memory = process.memoryUsage()

  console.log(JSON.stringify({
    total: timings.length,
    avgMs: Math.round(avg),
    p95Ms: percentile(timings, 0.95),
    memoryMB: Math.round(memory.rss / 1024 / 1024),
    metrics: metrics.snapshot()
  }, null, 2))
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
