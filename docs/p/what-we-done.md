# What We Have Done — Release Hardening & Distribution Stubs

Date: 2026-05-26

This document summarizes, in detailed form, the scaffold work performed to move SlopGuard into the "release hardening" and "supply-chain trustworthy" phase. The goal of these changes was to add deterministic, CI-native workflows and lightweight verification tooling without introducing external infrastructure.

The work here is intentionally minimal and deterministic: each script and workflow is a stub designed to be fleshed out with project-specific logic, signing keys, and CI secrets. The stubs include clear entry points for provenance generation, reproducible build verification, integrity checks, and smoke tests.

## High-level summary

- Added GitHub Actions workflow stubs for release, publish, provenance, smoke-tests, and reproducibility checks.
- Added a set of TypeScript script stubs under `scripts/` that provide the entry points for release checks, reproducibility verification, build verification, package audits, integrity checks, monorepo validation, smoke tests, and publish preview.
- Added documentation stubs in `docs/` and governance files under `.github/` (SECURITY, SUPPORT, CODEOWNERS, ISSUE_TEMPLATE).
- Added minimal unit test skeletons in `tests/` to be expanded into automated verification of reproducibility, provenance, and release integrity.

## Files added and purpose

- `.github/workflows/release.yml`
  - Trigger: `release` event (published). Runs `scripts/release-check.ts` and contains a placeholder publish step. Intended to be the gate that blocks publishing unless all checks pass.

- `.github/workflows/publish.yml`
  - Manual `workflow_dispatch` to run a preview publish flow (`scripts/publish-preview.ts`). Intended for controlled dry-run publishes and human-reviewed releases.

- `.github/workflows/provenance.yml`
  - Trigger: push tags `v*`. Placeholder step for generating and signing provenance artifacts (e.g., in-toto attestations or SLSA-style provenance). This workflow should be wired to secure signing keys (OIDC or GitHub Secrets) and must produce verifiable signed metadata.

- `.github/workflows/smoke-tests.yml`
  - Manual dispatcher that runs `scripts/smoke-test.ts` to perform CLI-level smoke tests (install, scan, dry-run flows).

- `.github/workflows/reproducibility.yml`
  - Manual dispatcher to evaluate reproducibility via `scripts/reproducibility-check.ts`.

- `scripts/release-check.ts`
  - Orchestration stub invoked during releases. Performs basic safety checks (e.g., repository cleanliness). Should evolve to validate changelog, semantic version, provenance presence, reproducibility results, and to fail the release when conditions are unmet.

- `scripts/verify-build.ts`
  - Intended to validate build artifacts and perform hash comparisons between different build runs.

- `scripts/reproducibility-check.ts`
  - Intended to perform deterministic build verification: run build in normalized environment multiple times, normalize timestamps/metadata, compare artifact hashes/tarballs.

- `scripts/smoke-test.ts`
  - Runs essential CLI smoke tests such as `npx slopguard check react`, `npx slopguard scan`, and `npx slopguard install lodash --dry-run`. Should exercise the main user flows and quick MCP integration points.

- `scripts/package-audit.ts`
  - Final tarball inspection: file listing, export-map validation, size checks, and scanning for accidental dev artifacts or secrets.

- `scripts/publish-preview.ts`
  - Outputs what would be published (package contents, version, checksums). Useful for dry-run approvals.

- `scripts/integrity-check.ts`
  - Validates artifact hashes, checks provenance signatures, and enforces policy on what may be published.

- `scripts/monorepo-validation.ts`
  - Entry point for testing traversal and policy enforcement across large workspace layouts (pnpm workspaces, Turborepo, Nx).

- `docs/` (stubs): `enterprise-guide.md`, `policy-guide.md`, `ai-agent-guide.md`, `ci-guide.md`, `troubleshooting.md`, `migration-guide.md`.

- `.github/SECURITY.md`, `.github/SUPPORT.md`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/bug_report.md` — basic governance files.

- `tests/` (skeletons): `release-check.test.ts`, `smoke-test.test.ts`, `reproducibility.test.ts`, `integrity-check.test.ts`, `package-audit.test.ts`, `monorepo-validation.test.ts`.

## How this maps to requirements from `m.md`

- **Release pipeline** — `release.yml` + `scripts/release-check.ts` provide the gate. The stub enforces a dirty-repo check and is intended to be extended to validate changelogs, semantic versioning, and provenance prior to publishing.

- **Provenance publishing** — `provenance.yml` is the placeholder where provenance artifacts should be produced and signed. This must be extended to produce in-toto or SLSA provenance records, sign them with a secured key, and publish or attach them to the release.

- **Reproducible builds** — `reproducibility-check.ts` is the starting point for deterministic-build verification. The expected flow: normalize environment (NODE_OPTIONS, TZ, timestamps), run build twice, produce normalized tarballs, compare hashes.

- **Smoke tests** — `smoke-tests.yml` + `smoke-test.ts` exercise the CLI and core integration points (install enforcement, MCP registration). These must be augmented with realistic test fixtures (small sample projects) that exercise lockfile parsing and enforcement.

- **Package audit & integrity** — `package-audit.ts` and `integrity-check.ts` form the foundation for final artifact inspection and signature verification.

- **Monorepo validation** — `monorepo-validation.ts` should contain configurable test suites against representative large monorepos to assert traversal performance and correctness.

## How to run the new checks locally (examples)

Note: these scripts are TS stubs and assume `ts-node` is available in CI. If you prefer compiled JS, add a build step to compile `src` and `scripts`.

1) Run release-check locally

```bash
npm ci
npx ts-node ./scripts/release-check.ts
```

2) Run smoke tests locally

```bash
npx ts-node ./scripts/smoke-test.ts
```

3) Run reproducibility dry-run

```bash
npx ts-node ./scripts/reproducibility-check.ts
```

4) Run package audit stub

```bash
npx ts-node ./scripts/package-audit.ts
```

## Next recommended implementation steps (prioritized)

1. Implement deterministic build harness
   - Normalize environment (locale, TZ, SOURCE_DATE_EPOCH, NODE_OPTIONS)
   - Ensure packaging uses reproducible tar options (e.g., `--mtime`, deterministic file order)
   - Add `scripts/reproducibility-check.ts` logic to run two identical builds in clean ephemeral dirs and compare artifact hashes.

2. Provenance generation and signing
   - Implement in `scripts/provenance-generate.ts` (or extend `provenance.yml`) to produce in-toto provenance and sign using OIDC-funded key material or GitHub Actions `openid`/`signing-key` integrations.
   - Validate signed metadata in `scripts/integrity-check.ts`.

3. Package audit expansion
   - Implement export-map verification, license checks, forbidden file patterns, and secret scanning.

4. Smoke test harness
   - Add small fixture projects in `tests/fixtures/` to drive `scripts/smoke-test.ts` and assert runtime behavior (CLI, enforce, dry-run install).

5. CI hardening
   - Pin action versions, add OIDC key access, require manual approvals for publish jobs, and store signing credentials in secure entry points.

6. Tests and verification
   - Convert the test skeletons into concrete tests using fixture artifacts and mock registries (e.g., Verdaccio or npm pack simulation).

## Assumptions & notes

- These files are intentionally minimal stubs to avoid introducing secrets or complex configuration into the repository. They are scaffolding for secure, deterministic implementation.
- Real provenance generation requires signing keys and decisions about key custody (enterprise HSM or GitHub OIDC key exchange). This repository intentionally leaves those choices to the operator.
- Reproducible builds require normalizing filesystem metadata and build toolchain versions. Consider using `SOURCE_DATE_EPOCH`, `tar --mtime`, and build container images to further constrain the environment.

## Quick checklist to productionize

- [ ] Implement reproducible build script and verify repeatable artifact hashes.
- [ ] Generate and sign provenance artifacts; publish them with releases.
- [ ] Expand `package-audit.ts` to fail on secrets, forbidden files, oversized packages.
- [ ] Add smoke-test fixtures and assert critical CLI flows.
- [ ] Harden `.github/workflows/release.yml` to perform a signed publish using secure key material and approvals.

## Where to find things (paths)

- Workflows: `.github/workflows/`
- Scripts: `scripts/`
- Docs: `docs/` and `docs/p/what-we-done.md` (this file)
- Tests: `tests/`

---

If you want, I can now implement step 1 (deterministic build harness) or step 2 (provenance generation) — which should I start on? I can create full runnable scripts, tests, and CI wiring for either.
