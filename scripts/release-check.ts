#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

type ReleaseCheckOptions = {
  repoRoot: string
  allowDirty: boolean
  expectedVersion?: string
  requireProvenance: boolean
  provenanceFile?: string
  provenanceSignature?: string
  provenancePublicKey?: string
  requireSignature: boolean
  skipIntegrity: boolean
}

function log(...args: any[]) {
  console.log('[release-check]', ...args)
}

function readPackageVersion(repoRoot: string) {
  const pkgPath = resolve(repoRoot, 'package.json')
  if (!existsSync(pkgPath)) return null
  try {
    const json = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return typeof json.version === 'string' ? json.version : null
  } catch {
    return null
  }
}

function gitIsClean() {
  const status = execSync('git status --porcelain').toString().trim()
  return status.length === 0
}

function getTagVersion() {
  const ref = process.env.GITHUB_REF || ''
  if (!ref.startsWith('refs/tags/')) return null
  const tag = ref.slice('refs/tags/'.length)
  return tag.startsWith('v') ? tag.slice(1) : tag
}

function runIntegrityCheck(repoRoot: string, provenanceFile?: string, requireProvenance?: boolean, signatureFile?: string, publicKeyFile?: string, requireSignature?: boolean) {
  const args = ['./scripts/integrity-check.ts', '--workspace', repoRoot]
  if (provenanceFile) args.push('--provenance-file', provenanceFile)
  if (requireProvenance) args.push('--require-provenance')
  if (signatureFile) args.push('--provenance-signature', signatureFile)
  if (publicKeyFile) args.push('--provenance-public-key', publicKeyFile)
  if (requireSignature) args.push('--require-signature')

  const res = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, TS_NODE_FILES: 'true', TS_NODE_TRANSPILE_ONLY: 'true' }
  })
  if (res.error) throw res.error
  if (res.status !== 0) {
    console.error(res.stdout)
    console.error(res.stderr)
    throw new Error('integrity-check failed')
  }
}

function parseArgs(): ReleaseCheckOptions {
  const args = process.argv.slice(2)
  const workspaceArgIndex = args.indexOf('--workspace')
  const expectedVersionIndex = args.indexOf('--expected-version')
  const provenanceIndex = args.indexOf('--provenance-file')
  const signatureIndex = args.indexOf('--provenance-signature')
  const publicKeyIndex = args.indexOf('--provenance-public-key')
  const repoRoot = workspaceArgIndex >= 0 ? resolve(args[workspaceArgIndex + 1]) : process.cwd()
  const expectedVersion = expectedVersionIndex >= 0 ? args[expectedVersionIndex + 1] : undefined
  const provenanceFile = provenanceIndex >= 0 ? resolve(args[provenanceIndex + 1]) : undefined
  const provenanceSignature = signatureIndex >= 0 ? resolve(args[signatureIndex + 1]) : undefined
  const provenancePublicKey = publicKeyIndex >= 0 ? resolve(args[publicKeyIndex + 1]) : undefined

  return {
    repoRoot,
    allowDirty: args.includes('--allow-dirty'),
    expectedVersion,
    requireProvenance: args.includes('--require-provenance'),
    provenanceFile,
    provenanceSignature,
    provenancePublicKey,
    requireSignature: args.includes('--require-signature'),
    skipIntegrity: args.includes('--skip-integrity')
  }
}

function validateVersion(expected: string | null, actual: string | null) {
  if (!actual) return 'package.json version missing'
  if (!expected) return null
  if (actual !== expected) return `version mismatch: expected ${expected} got ${actual}`
  return null
}

function main() {
  const options = parseArgs()
  log('Running release checks')

  if (!options.allowDirty) {
    try {
      if (!gitIsClean()) {
        console.error('Repository is dirty. Aborting release.')
        process.exit(2)
      }
      log('Git clean.')
    } catch {
      console.warn('git not available or failed to run; continuing in CI environment.')
    }
  }

  const tagVersion = options.expectedVersion ?? getTagVersion()
  const pkgVersion = readPackageVersion(options.repoRoot)
  const versionError = validateVersion(tagVersion, pkgVersion)
  if (versionError) {
    console.error(versionError)
    process.exit(2)
  }

  if (options.requireProvenance && !options.provenanceFile) {
    console.error('provenance required but no file provided')
    process.exit(2)
  }
  if (options.requireSignature && !options.provenanceSignature) {
    console.error('provenance signature required but no file provided')
    process.exit(2)
  }

  if (!options.skipIntegrity) {
    try {
      runIntegrityCheck(
        options.repoRoot,
        options.provenanceFile,
        options.requireProvenance,
        options.provenanceSignature,
        options.provenancePublicKey,
        options.requireSignature
      )
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(2)
    }
  }

  console.log('Release checks passed')
}

main()
