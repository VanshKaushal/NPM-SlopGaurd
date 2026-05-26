import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { isHotlisted, loadHotlist } from '../dist/core/hotlist.js'

const hotlistPath = path.resolve(process.cwd(), 'src', 'data', 'hotlist.json')

test('hotlist detects entries', () => {
  const original = fs.readFileSync(hotlistPath, 'utf8')
  try {
    fs.writeFileSync(hotlistPath, JSON.stringify([{ name: 'reacts', confidence: 0.9 }]))
    const list = loadHotlist()
    assert.ok(Array.isArray(list))
    assert.equal(isHotlisted('reacts'), true)
    assert.equal(isHotlisted('react'), false)
  } finally {
    fs.writeFileSync(hotlistPath, original)
  }
})
