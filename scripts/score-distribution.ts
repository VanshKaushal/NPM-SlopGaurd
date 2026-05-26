import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

function bucket(score: number) {
  if (score < 50) return '0-49'
  if (score < 75) return '50-74'
  return '75-100'
}

async function run() {
  const pkgs = loadDataset('legit-packages.json')
  const buckets: Record<string, number> = { '0-49': 0, '50-74': 0, '75-100': 0 }

  for (const pkg of pkgs) {
    const res = await validatePackage(pkg)
    buckets[bucket(res.score)] += 1
  }

  console.log(JSON.stringify(buckets, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
