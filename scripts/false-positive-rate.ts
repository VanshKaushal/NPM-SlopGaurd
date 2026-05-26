import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

async function run() {
  const pkgs = loadDataset('legit-packages.json')
  let flagged = 0

  for (const pkg of pkgs) {
    const res = await validatePackage(pkg)
    if (res.hardBlocked || res.score < 75) flagged += 1
  }

  const rate = pkgs.length ? (flagged / pkgs.length) * 100 : 0

  console.log(`Total legit packages: ${pkgs.length}`)
  console.log(`Flagged incorrectly: ${flagged}`)
  console.log(`False positive rate: ${rate.toFixed(2)}%`)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
