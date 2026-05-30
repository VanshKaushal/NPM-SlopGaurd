import { test } from 'node:test'
import assert from 'node:assert'
import { matchBlocklist } from '../src/core/blocklist.js'

test('Scoped package blocklist pattern matching verification', () => {
  // Tier 1 — Exact
  let blocklist = { block: ['lodash'] }
  assert.ok(matchBlocklist('lodash', blocklist, false), 'Should block lodash')
  assert.ok(!matchBlocklist('lodash-fp', blocklist, false), 'Should PASS lodash-fp')
  assert.ok(!matchBlocklist('@scope/lodash', blocklist, false), 'Should PASS @scope/lodash')

  // Tier 2 — Scope glob
  blocklist = { block: ['@evil/*'] }
  assert.ok(matchBlocklist('@evil/anything', blocklist, false), 'Should block @evil/anything')
  assert.ok(matchBlocklist('@evil/react', blocklist, false), 'Should block @evil/react')
  assert.ok(matchBlocklist('@evil/lodash', blocklist, false), 'Should block @evil/lodash')
  assert.ok(!matchBlocklist('@notevil/package', blocklist, false), 'Should PASS @notevil/package')
  assert.ok(!matchBlocklist('evil-package', blocklist, false), 'Should PASS evil-package')

  // Tier 3 — Name glob
  blocklist = { block: ['react*'] }
  assert.ok(matchBlocklist('react', blocklist, false), 'Should block react')
  assert.ok(matchBlocklist('react-dom', blocklist, false), 'Should block react-dom')
  assert.ok(matchBlocklist('react-router', blocklist, false), 'Should block react-router')
  assert.ok(!matchBlocklist('preact', blocklist, false), 'Should PASS preact')
  assert.ok(!matchBlocklist('lodash', blocklist, false), 'Should PASS lodash')

  // Tier 4 — Substring
  blocklist = { block: ['contains:react'] }
  assert.ok(matchBlocklist('preact', blocklist, true), 'allowSubstringMatching: true should block preact')
  assert.ok(matchBlocklist('react-dom', blocklist, true), 'allowSubstringMatching: true should block react-dom')
  assert.ok(matchBlocklist('react', blocklist, true), 'allowSubstringMatching: true should block react')
  
  assert.ok(!matchBlocklist('preact', blocklist, false), 'allowSubstringMatching: false should PASS preact')
})
