# SlopGuard Audit Notes (Detailed)

Date: 2026-05-26
Scope: Static structural audit (Phase 1). No runtime execution was performed.

## Context
This note captures the detailed, file-referenced findings from the initial destructive audit planning pass. The goal is to preserve evidence for each structural and CI determinism risk before executing more invasive tests.

## Detailed Findings

### CRITICAL: Node engine mismatch in release/publish/reproducibility workflows
- Package engine requirement: Node >=20.
- Workflows pin Node 18 in release, publish, and reproducibility paths.
- This mismatch can cause ts-node ESM loader failures, package resolution differences, and silent runtime changes.
- Evidence:
  - [package.json](package.json#L17-L19)
  - [release.yml](.github/workflows/release.yml#L12-L16)
  - [publish.yml](.github/workflows/publish.yml#L10-L14)
  - [reproducibility.yml](.github/workflows/reproducibility.yml#L10-L14)

### HIGH: Non-deterministic dependency installation in CI
- CI uses npm install for core workflows.
- npm install is not lockfile-strict and can drift over time, even with a package-lock present.
- Evidence:
  - [ci.yml](.github/workflows/ci.yml#L15-L16)
  - [ci.yml](.github/workflows/ci.yml#L25-L26)

### HIGH: Floating action tags in workflows
- Workflows reference GitHub actions by major tags, not commit SHAs.
- This permits remote changes to alter CI behavior without code changes.
- Evidence:
  - [ci.yml](.github/workflows/ci.yml#L11-L12)
  - [release.yml](.github/workflows/release.yml#L10-L13)
  - [publish.yml](.github/workflows/publish.yml#L9-L11)
  - [reproducibility.yml](.github/workflows/reproducibility.yml#L9-L11)
  - [provenance.yml](.github/workflows/provenance.yml#L10-L12)
  - [smoke-tests.yml](.github/workflows/smoke-tests.yml#L9-L11)

### MEDIUM: TS tests are excluded from npm test
- npm test executes node --test ./tests/*.test.js only.
- TypeScript tests are not executed, hiding breakages in security-critical scripts.
- Evidence:
  - [package.json](package.json#L14)
  - [tests/smoke-test.test.ts](tests/smoke-test.test.ts#L1-L23)
  - [tests/reproducibility.test.ts](tests/reproducibility.test.ts#L1-L3)

### MEDIUM: Jest-style test without configured runner
- tests/reproducibility.test.ts uses expect without a configured test runner or import.
- This indicates a placeholder test that fails if executed.
- Evidence:
  - [tests/reproducibility.test.ts](tests/reproducibility.test.ts#L1-L3)

### LOW: Packed tarball committed to repository
- slopguard-0.1.0.tgz exists in repository root.
- This risks stale artifact usage and can confuse provenance and reproducibility checks.
- Evidence:
  - [slopguard-0.1.0.tgz](slopguard-0.1.0.tgz)

## Status Summary
- Structural integrity: WARNING
- CI determinism: FAIL
- Runtime stability: NOT EXECUTED
- Reproducibility: WARNING
- Monorepo stability: NOT EXECUTED

## Pending Work (Phases 2-9)
- CLI destructive testing: slopguard check/scan/install under adversarial inputs.
- Monorepo chaos testing: cycles, deep graphs, corrupted lockfiles.
- Reproducibility attacks: time, env, tarball ordering, path separators.
- Package audit bypass attempts: hidden files, large binaries, malformed export maps.
- Provenance/integrity attacks: mismatched digests, altered attestations.
- MCP and policy chaos: invalid schemas, conflicting rules, silent overrides.
- Performance collapse testing: huge graphs, slow registries, retry/timeout behavior.
