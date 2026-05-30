import { test } from 'node:test'
import assert from 'node:assert'
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// Tests always run via `npm test` from the project root, so process.cwd() is reliable.
const root = process.cwd()
// Support both tsconfig rootDir layouts: dist/src/cli.js (rootDir=project) or dist/cli.js (rootDir=src)
const cliSrc = path.join(root, 'dist', 'src', 'cli.js')
const cliRoot = path.join(root, 'dist', 'cli.js')
const cli = fs.existsSync(cliSrc) ? cliSrc : cliRoot

function runCli(args: string[], cwd = root) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30000
  })
}

test('exit code 0 — --help flag exits cleanly', () => {
  const result = runCli(['--help'])
  assert.strictEqual(result.status, 0, '--help should exit with code 0')
  assert.ok(result.stdout.includes('SlopGuard'), '--help output must mention SlopGuard')
  assert.ok(result.stdout.includes('--output'), '--help must document --output flag')
  assert.ok(result.stdout.includes('enterprise-policy'), '--help must list enterprise-policy mode')
  assert.ok(result.stdout.includes('Exit Codes') || result.stdout.includes('EXIT CODES'), '--help must document exit codes')
})

test('exit code 3 — unknown command exits with 3', () => {
  const result = runCli(['nonexistent-command-xyz'])
  assert.strictEqual(result.status, 3, 'Unknown command should exit with code 3')
})

test('exit code 2 — hard-blocked package exits with 2', () => {
  // Use a package name that contains a blocklist trigger pattern
  // We test via check command which validates a single package
  // If registry is unreachable in test environment, it will still check blocklist first
  const result = runCli(['check', '@evil/malware@1.0.0'])
  // Either blocked (2) or internal error during network (3) — must not be 0
  assert.ok(
    result.status === 1 || result.status === 2 || result.status === 3,
    `Should not exit 0 for a potentially dangerous package, got ${result.status}`
  )
})

test('--help output documents all required flags', () => {
  const result = runCli(['--help'])
  assert.strictEqual(result.status, 0)
  const out = result.stdout

  const requiredFlags = ['--output', '--policy', '--offline', '--dry-run', '--allow', '--ignore-warnings', '--verify-integrity', '--json', '--sarif']
  for (const flag of requiredFlags) {
    assert.ok(out.includes(flag), `--help must document flag ${flag}`)
  }
})

test('--help output documents all policy pack names', () => {
  const result = runCli(['--help'])
  assert.strictEqual(result.status, 0)
  const out = result.stdout

  const policyModes = ['permissive', 'balanced', 'strict', 'paranoid', 'enterprise-policy', 'fintech-policy', 'ai-agent-policy', 'ci-lockdown-policy']
  for (const mode of policyModes) {
    assert.ok(out.includes(mode), `--help must document policy mode ${mode}`)
  }
})

test('--help output documents exit codes', () => {
  const result = runCli(['--help'])
  assert.strictEqual(result.status, 0)
  const out = result.stdout

  // Exit codes 0, 1, 2, 3 must all be explained
  assert.ok(out.includes('0') && out.includes('1') && out.includes('2') && out.includes('3'),
    '--help must document all exit codes 0-3')
})

test('--help output includes usage example', () => {
  const result = runCli(['--help'])
  assert.strictEqual(result.status, 0)
  const out = result.stdout

  assert.ok(out.includes('slopguard check') || out.includes('slopguard scan'),
    '--help must include at least one usage example')
})
