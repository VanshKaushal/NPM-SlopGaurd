import fs from 'fs'
import path from 'path'
import { validatePackage } from '../src/core/validator.js'
import { explainResult } from '../src/core/explainability.js'

function loadDataset(fileName: string) {
  const file = path.resolve(process.cwd(), 'datasets', fileName)
  const raw = fs.readFileSync(file, 'utf8')
  return JSON.parse(raw) as string[]
}

async function evaluateSet(name: string, packages: string[]) {
  const results = [] as any[]
  for (const pkg of packages) {
    const res = await validatePackage(pkg)
    results.push({ pkg, score: res.score, hardBlocked: res.hardBlocked, explain: explainResult(res) })
  }
  return { name, total: results.length, results }
}

async function run() {
  const sets = [
    ['legit', 'legit-packages.json'],
    ['malicious', 'malicious-packages.json'],
    ['hallucinated', 'hallucinated-packages.json'],
    ['edgecases', 'edgecases.json']
  ]

  const output = []
  for (const [name, file] of sets) {
    const data = loadDataset(file)
    output.push(await evaluateSet(name, data))
  }

  console.log(JSON.stringify(output, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
