import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'
import { computeConfidence } from '../src/core/confidence.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

async function run() {
  const pkgs = loadDataset('legit-packages.json')
  const counts: Record<string, number> = { low: 0, medium: 0, high: 0 }

  for (const pkg of pkgs) {
    const res = await validatePackage(pkg)
    const confidence = computeConfidence(res)
    counts[confidence.level] += 1
  }

  console.log(JSON.stringify(counts, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
