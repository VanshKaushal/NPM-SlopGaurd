import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePackage } from '../dist/core/validator.js'

const originalFetch = globalThis.fetch

function mockFetch(routes) {
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    for (const [prefix, handler] of routes) {
      if (url.startsWith(prefix)) return handler(url, init)
    }
    throw new Error(`Unexpected fetch: ${url}`)
  }
}

test('hard blocks on registry 404', async () => {
  mockFetch([
    ['https://registry.npmjs.org/nope', async () => new Response('', { status: 404 })]
  ])
  const res = await validatePackage('nope')
  assert.equal(res.hardBlocked, true)
  assert.equal(res.score, 0)
})

test('warns on low download velocity', async () => {
  mockFetch([
    ['https://registry.npmjs.org/testpkg', async () => new Response(JSON.stringify({
      name: 'testpkg',
      time: { '1.0.0': new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
      maintainers: [{ name: 'alice' }],
      'dist-tags': { latest: '1.0.0' },
      versions: { '1.0.0': { publisher: { name: 'alice' } } }
    }), { status: 200 })],
    ['https://registry.npmjs.org/-/user/org.couchdb.user:alice', async () => new Response(JSON.stringify({
      time: { created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString() }
    }), { status: 200 })],
    ['https://api.npmjs.org/downloads/point/last-week/testpkg', async () => new Response(JSON.stringify({
      downloads: 10
    }), { status: 200 })],
    ['https://registry.npmjs.org/-/npm/v1/attestations/testpkg@1.0.0', async () => new Response(JSON.stringify({
      attestations: []
    }), { status: 200 })]
  ])

  const res = await validatePackage('testpkg')
  assert.equal(res.hardBlocked, false)
  const warningNames = res.warnings.map(w => w.name)
  assert.ok(warningNames.includes('download_velocity'))
})

test('restores fetch', () => {
  globalThis.fetch = originalFetch
  assert.equal(globalThis.fetch, originalFetch)
})
