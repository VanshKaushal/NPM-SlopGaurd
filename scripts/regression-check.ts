import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

function loadBaseline(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as { falsePositiveRate?: number; avgScore?: number }
}

async function run() {
  const pkgs = loadDataset('legit-packages.json')
  let flagged = 0
  let totalScore = 0

  for (const pkg of pkgs) {
    const res = await validatePackage(pkg)
    if (res.hardBlocked || res.score < 75) flagged += 1
    totalScore += res.score
  }

  const falsePositiveRate = pkgs.length ? flagged / pkgs.length : 0
  const avgScore = pkgs.length ? totalScore / pkgs.length : 0

  const baselinePath = process.argv[2]
  if (baselinePath) {
    const baseline = loadBaseline(baselinePath)
    const fpDelta = falsePositiveRate - (baseline.falsePositiveRate ?? 0)
    const scoreDelta = avgScore - (baseline.avgScore ?? 0)

    if (fpDelta > 0.01 || scoreDelta < -5) {
      console.error('Regression detected')
      console.error(JSON.stringify({ falsePositiveRate, avgScore, fpDelta, scoreDelta }, null, 2))
      process.exit(1)
    }
  }

  console.log(JSON.stringify({ falsePositiveRate, avgScore }, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
