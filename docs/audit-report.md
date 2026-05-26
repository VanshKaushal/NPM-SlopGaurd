# SlopGuard Infrastructure Audit Report

Date: 2026-05-26 
Scope: Phase 1 (structural + CI determinism) audit only. No destructive execution was run in this report.

## Executive Summary
This report documents an adversarial structural audit of SlopGuard with a focus on determinism, runtime stability, and CI/CD reproducibility. The audit was limited to static inspection of repository structure, package metadata, and workflow configuration. The findings below include actionable evidence and concrete reproduction context.

Overall status:
- Structural integrity: WARNING
- CI determinism: FAIL
- Runtime stability: NOT EXECUTED
- Reproducibility: WARNING
- Monorepo stability: NOT EXECUTED

## Findings (by severity)

### CRITICAL
1) Node engine mismatch across release/publish/reproducibility workflows
- Evidence: Package requires Node >=20 but multiple workflows pin Node 18.
- Impact: Runtime and build behavior diverges from supported engine. This can cause ts-node/ESM loader errors, nondeterministic failures, or silent changes in dependency resolution.
- Evidence links:
  - [package.json](package.json#L17-L19)
  - [release.yml](.github/workflows/release.yml#L12-L16)
  - [publish.yml](.github/workflows/publish.yml#L10-L14)
  - [reproducibility.yml](.github/workflows/reproducibility.yml#L10-L14)
- Root cause: Workflow engine pinning is inconsistent with package engine constraints.
- Deterministic fix: Align all workflow Node versions to >=20 (prefer a single pinned patch version across workflows).

### HIGH
2) CI uses npm install instead of npm ci
- Evidence: CI workflow uses npm install for build/test and hotlist validation.
- Impact: npm install is not lockfile-strict and can introduce nondeterministic dependency resolution across runs.
- Evidence links:
  - [ci.yml](.github/workflows/ci.yml#L15-L16)
  - [ci.yml](.github/workflows/ci.yml#L25-L26)
- Root cause: Workflow dependency installation step is not lockfile-enforced.
- Deterministic fix: Replace npm install with npm ci in CI workflows.

3) Workflow actions are floating on major tags
- Evidence: actions/checkout@v4 and actions/setup-node@v4 are used without pinned SHAs.
- Impact: CI behavior can change without repository changes, breaking reproducibility and auditability.
- Evidence links:
  - [ci.yml](.github/workflows/ci.yml#L11-L12)
  - [release.yml](.github/workflows/release.yml#L10-L13)
  - [publish.yml](.github/workflows/publish.yml#L9-L11)
  - [reproducibility.yml](.github/workflows/reproducibility.yml#L9-L11)
  - [provenance.yml](.github/workflows/provenance.yml#L10-L12)
  - [smoke-tests.yml](.github/workflows/smoke-tests.yml#L9-L11)
- Root cause: Actions are referenced by mutable tags.
- Deterministic fix: Pin actions to full commit SHAs and periodically roll them in a controlled change.

### MEDIUM
4) Test selection excludes TypeScript tests
- Evidence: npm test only runs node --test ./tests/*.test.js, so all *.test.ts files are ignored.
- Impact: Critical test coverage for reproducibility, smoke, integrity, and related behaviors is silently skipped.
- Evidence links:
  - [package.json](package.json#L14)
  - [tests/smoke-test.test.ts](tests/smoke-test.test.ts#L1-L23)
  - [tests/reproducibility.test.ts](tests/reproducibility.test.ts#L1-L3)
- Root cause: Test command does not include TS tests or a TS-aware runner.
- Deterministic fix: Add a TS test execution path or transpile tests before running.

5) Jest-style expect used without runner or import
- Evidence: tests/reproducibility.test.ts uses expect without defining it.
- Impact: When executed, this test fails at runtime, creating false confidence.
- Evidence links:
  - [tests/reproducibility.test.ts](tests/reproducibility.test.ts#L1-L3)
- Root cause: Placeholder test was added without a real test framework or assertion import.
- Deterministic fix: Replace with node:test + assert or add a configured test runner.

### LOW
6) Release artifact tarball checked into repository
- Evidence: slopguard-0.1.0.tgz is present in repo root.
- Impact: Risk of stale or incorrect release artifact being used or shipped. Can also confuse reproducibility checks.
- Evidence link:
  - [slopguard-0.1.0.tgz](slopguard-0.1.0.tgz)
- Root cause: Packed artifact committed to repository.
- Deterministic fix: Remove packaged tarballs from VCS; create artifacts in CI only.

## Risks
- CI determinism is currently not guaranteed due to mutable action tags and non-lockfile installs.
- Workflow engines are inconsistent with stated runtime requirements, which undermines reproducibility claims.
- Test coverage gaps hide failures in critical security and integrity pathways.

## Recommended Next Steps (No code changes yet)
1) Align Node engine pins across all workflows to match package requirements.
2) Replace npm install with npm ci in CI workflows.
3) Pin GitHub actions to SHAs.
4) Fix or remove failing TS tests and run them in CI.
5) Remove committed release artifacts from the repo and enforce via CI checks.

## Not Executed
No destructive runtime tests were executed in this report. Phases 2-9 (CLI stress, monorepo chaos, reproducibility attack, package audit, provenance/integrity attack, policy chaos, performance collapse) remain pending.
