import test from 'node:test'
import assert from 'node:assert/strict'
import { TTLCache } from '../src/core/cache.js'

test('TTLCache expires entries', () => {
  const cache = new TTLCache(1000)
  cache.set('a', 1, -1)
  assert.equal(cache.get('a'), undefined)
})
