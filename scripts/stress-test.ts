import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'
import { createLimiter } from '../src/core/concurrency.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

async function run() {
  const pkgs = loadDataset('legit-packages.json')
  const limit = createLimiter(10)

  const tasks = pkgs.map(pkg => limit(() => validatePackage(pkg)))
  const results = await Promise.all(tasks)

  const blocked = results.filter(r => r.hardBlocked).length
  const warnings = results.filter(r => r.score < 75).length

  console.log(JSON.stringify({
    total: results.length,
    blocked,
    warnings
  }, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
