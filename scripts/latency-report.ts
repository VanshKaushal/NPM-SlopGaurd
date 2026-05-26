import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

async function run() {
  const pkgs = loadDataset('legit-packages.json')
  const timings: number[] = []

  for (const pkg of pkgs) {
    const start = Date.now()
    await validatePackage(pkg)
    timings.push(Date.now() - start)
  }

  console.log(JSON.stringify({
    total: timings.length,
    avgMs: Math.round(timings.reduce((a, b) => a + b, 0) / (timings.length || 1)),
    p50Ms: percentile(timings, 0.5),
    p95Ms: percentile(timings, 0.95)
  }, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
