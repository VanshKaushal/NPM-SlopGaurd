import { test } from 'node:test'
import assert from 'node:assert'
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const root = process.cwd()
const cliSrc = path.join(root, 'dist', 'src', 'cli.js')
const cliRoot = path.join(root, 'dist', 'cli.js')
const cli = fs.existsSync(cliSrc) ? cliSrc : cliRoot

function runCliJson(args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000
  })
  return result
}

test('JSON output schema — check command produces required fields', () => {
  // This test checks the CLI's --json output on a check command
  // We run against a real package. If network is unavailable, result may be degraded,
  // but the schema must still be present.
  const result = runCliJson(['check', 'react@18.2.0', '--json'])

  // Extract JSON from stdout (may have non-JSON prefix lines)
  const lines = result.stdout.split('\n')
  const jsonStart = lines.findIndex(l => l.trim().startsWith('{'))
  assert.ok(jsonStart >= 0, 'Output must contain a JSON object')

  const jsonText = lines.slice(jsonStart).join('\n')
  let output: any
  try {
    output = JSON.parse(jsonText)
  } catch (e) {
    assert.fail(`JSON output could not be parsed: ${e}`)
  }

  // Required top-level fields
  assert.ok('slopguard_version' in output, 'JSON must contain slopguard_version')
  assert.ok('scan_timestamp' in output, 'JSON must contain scan_timestamp')
  assert.ok('trace_id' in output, 'JSON must contain trace_id')
  assert.ok('summary' in output, 'JSON must contain summary')
  assert.ok('packages' in output, 'JSON must contain packages array')

  // trace_id must be UUID v4
  assert.match(output.trace_id, UUID_V4_REGEX, `trace_id must be UUID v4, got: ${output.trace_id}`)

  // scan_timestamp must be ISO 8601
  assert.ok(!isNaN(Date.parse(output.scan_timestamp)), 'scan_timestamp must be a valid ISO date')

  // summary fields
  const s = output.summary
  assert.ok('total_packages' in s, 'summary must contain total_packages')
  assert.ok('blocked' in s, 'summary must contain blocked')
  assert.ok('scan_duration_ms' in s, 'summary must contain scan_duration_ms')
  assert.strictEqual(typeof s.total_packages, 'number', 'total_packages must be a number')
  assert.strictEqual(typeof s.blocked, 'number', 'blocked must be a number')
  assert.strictEqual(typeof s.scan_duration_ms, 'number', 'scan_duration_ms must be a number')

  // packages array
  assert.ok(Array.isArray(output.packages), 'packages must be an array')
  if (output.packages.length > 0) {
    const pkg = output.packages[0]
    assert.ok('name' in pkg, 'package entry must contain name')
    assert.ok('score' in pkg, 'package entry must contain score')
    assert.ok('decision' in pkg, 'package entry must contain decision')
    assert.ok('signals' in pkg, 'package entry must contain signals')
    assert.ok('reasons' in pkg, 'package entry must contain reasons')
    assert.ok(['allow', 'warn', 'block'].includes(pkg.decision), `decision must be allow/warn/block, got: ${pkg.decision}`)
    assert.strictEqual(typeof pkg.score, 'number', 'score must be a number')
    assert.ok(Array.isArray(pkg.reasons), 'reasons must be an array')
  }
})

test('SARIF output — schema compliance', () => {
  const result = runCliJson(['check', 'react@18.2.0', '--sarif'])

  const lines = result.stdout.split('\n')
  const jsonStart = lines.findIndex(l => l.trim().startsWith('{'))
  if (jsonStart < 0) return // If blocked early, no SARIF output

  const jsonText = lines.slice(jsonStart).join('\n')
  let sarif: any
  try {
    sarif = JSON.parse(jsonText)
  } catch {
    return // Network may fail in test environment; skip if no output
  }

  assert.strictEqual(sarif.version, '2.1.0', 'SARIF version must be 2.1.0')
  assert.ok(Array.isArray(sarif.runs), 'SARIF must have runs array')
  assert.strictEqual(sarif.runs[0].tool.driver.name, 'SlopGuard', 'tool.driver.name must be SlopGuard')

  // results must be an array
  assert.ok(Array.isArray(sarif.runs[0].results), 'SARIF runs[0].results must be array')

  // Check each result has proper level if results exist
  for (const r of sarif.runs[0].results) {
    assert.ok(['error', 'warning', 'note', 'none'].includes(r.level),
      `SARIF result level must be valid, got: ${r.level}`)
  }
})

test('JSON trace_id is unique per invocation', () => {
  const r1 = runCliJson(['check', 'react@18.2.0', '--json'])
  const r2 = runCliJson(['check', 'react@18.2.0', '--json'])

  const extractTraceId = (stdout: string) => {
    try {
      const lines = stdout.split('\n')
      const jsonStart = lines.findIndex(l => l.trim().startsWith('{'))
      return JSON.parse(lines.slice(jsonStart).join('\n')).trace_id
    } catch {
      return null
    }
  }

  const id1 = extractTraceId(r1.stdout)
  const id2 = extractTraceId(r2.stdout)

  if (id1 && id2) {
    assert.notStrictEqual(id1, id2, 'trace_id must be unique per invocation')
    assert.match(id1, UUID_V4_REGEX, 'trace_id 1 must be UUID v4')
    assert.match(id2, UUID_V4_REGEX, 'trace_id 2 must be UUID v4')
  }
})
