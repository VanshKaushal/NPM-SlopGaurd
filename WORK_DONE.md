# SlopGuard Work Summary

This document captures what has been implemented so far in the repository, with file references and concrete behavior notes.

## Chat updates

### 2026-05-25

- Added install enforcement layer with package manager detection, safe arg parsing, and proxy install flow.
- Implemented manager-specific install commands and secure spawn with stdio passthrough.
- Extended CLI to support `slopguard install` plus related flags.
- Added lockfile parsing, workspace discovery, dependency graph traversal, and install-script risk analysis.
- Added recursive graph validation for CLI, MCP, and GitHub Action workflows.
- Added resilience primitives: retries, backoff, timeouts, circuit breakers, request manager, and metrics.
- Routed registry, downloads, and provenance fetches through the resilience layer for graceful degradation.
- Added calibration datasets, benchmarking scripts, and explainability/confidence helpers.
- Enhanced CLI, MCP, and Action outputs with confidence/explainability details.

Files:
- src/install/args.ts
- src/install/detect-manager.ts
- src/install/install-flow.ts
- src/install/npm.ts
- src/install/pnpm.ts
- src/install/proxy-install.ts
- src/install/spawn.ts
- src/install/yarn.ts
- src/cli.ts
- src/core/graph.ts
- src/core/lockfiles.ts
- src/core/package-lock.ts
- src/core/pnpm-lock.ts
- src/core/yarn-lock.ts
- src/core/workspaces.ts
- src/core/manifests.ts
- src/core/resolver.ts
- src/core/semver.ts
- src/core/install-scripts.ts
- src/core/backoff.ts
- src/core/retry.ts
- src/core/timeout.ts
- src/core/circuit-breaker.ts
- src/core/metrics.ts
- src/core/errors.ts
- src/core/request-manager.ts
- src/core/resilience.ts
- src/core/degradation.ts
- src/action.ts
- src/mcp.ts
- src/types.ts
- package.json
- src/core/registry.ts
- src/core/downloads.ts
- src/core/provenance.ts
- src/core/confidence.ts
- src/core/explainability.ts
- src/core/calibration.ts
- src/core/benchmark.ts
- datasets/legit-packages.json
- datasets/malicious-packages.json
- datasets/hallucinated-packages.json
- datasets/edgecases.json
- datasets/monorepos.json
- datasets/install-script-packages.json
- scripts/benchmark.ts
- scripts/evaluate.ts
- scripts/false-positive-rate.ts
- scripts/score-distribution.ts
- scripts/graph-benchmark.ts
- scripts/stress-test.ts
- scripts/latency-report.ts
- scripts/confidence-analysis.ts
- scripts/regression-check.ts

## Project scaffolding

- TypeScript project config and build scripts were added.
- Node 20+ is required and the project is ESM.

Files:
- package.json
- tsconfig.json

## Core types and configuration

- Shared types for signals, results, and scoring are defined.
- Default thresholds are centralized for consistency.
- Config loading supports slopguard.config.js with zod validation and sane defaults.

Files:
- src/types.ts
- src/core/config.ts
- slopguard.config.js

## Core utilities

- TTL cache with lazy expiration and generic API.
- Concurrency limiter and in-flight request dedupe helper.
- Scoring helper that applies weighted deductions per signal.

Files:
- src/core/cache.ts
- src/core/concurrency.ts
- src/core/scoring.ts

## Signal implementations

### Signal 1: Registry existence

- Uses npm registry endpoint to verify existence.
- Hard block on 404.
- Uses timeout and cache; network failures yield unknown rather than false positives.

Files:
- src/core/registry.ts
- src/core/validator.ts

### Signal 2: Publisher account age

- Resolves publisher and maintainers from package metadata.
- Fetches user creation time when available.
- Warn-only if below threshold; unknown if unavailable.

Files:
- src/core/registry.ts
- src/core/validator.ts

### Signal 3: Version age

- Resolves version timestamp from registry metadata.
- Handles dist-tags and semver ranges conservatively.
- Warn-only if below threshold; unknown if unavailable.

Files:
- src/core/validator.ts

### Signal 4: Download velocity

- Uses npm downloads API (last week point).
- Warn-only if below threshold; unknown if unavailable.

Files:
- src/core/downloads.ts
- src/core/validator.ts

### Signal 5: Hallucination hotlist

- Local JSON hotlist with zod schema validation.
- Hard block on match.
- Includes standalone validator script for CI.

Files:
- src/core/hotlist.ts
- src/data/hotlist.json
- scripts/validate-hotlist.mjs

### Signal 6: Provenance attestation

- Uses npm attestation endpoint.
- Warn-only when missing; unknown on errors.

Files:
- src/core/provenance.ts
- src/core/validator.ts

## Validator orchestrator

- Parses package spec and resolves exact version.
- Fail-fast on hard-block signals.
- Runs warning signals concurrently with safe fallbacks.
- Produces deterministic ValidationResult with score and per-signal output.

Files:
- src/core/validator.ts

## CLI surface

- Commands:
  - slopguard check <pkg[@version]>
  - slopguard scan
- Flags:
  - --allow
  - --ignore-warnings
- Colored, per-signal output and correct exit codes.

Files:
- src/cli.ts

## MCP server

- Stdio MCP server with two tools:
  - check_package
  - scan_package_json
- Uses zod for input schemas.
- Returns JSON serialized as text for compatibility.

Files:
- src/mcp.ts

## GitHub Action

- Scans package.json files (recursive) and annotates warnings/errors.
- Supports monorepos and configurable concurrency.

Files:
- src/action.ts
- action.yml

## Documentation

- README includes quick start, CLI, MCP, Action usage, architecture, threat model, false-positive philosophy, config, and hotlist examples.
- CONTRIBUTING covers hotlist workflow and verification rules.
- PR template added.

Files:
- README.md
- CONTRIBUTING.md
- .github/pull_request_template.md

## Tests and CI

- Tests use node:test with mock fetch for validator.
- Hotlist schema validation script and CI job added.
- CI runs build, tests, and hotlist validation.

Files:
- tests/cache.test.js
- tests/hotlist.test.js
- tests/validator.test.js
- .github/workflows/ci.yml

## Scripts

- npm scripts: build, start, dev, test, hotlist:validate.

Files:
- package.json

## Status recap

- Core functionality, CLI, MCP, Action, docs, and tests are in place.
- Hotlist validation is enforced in CI.
- Remaining optional items: demo GIF and release changelog scaffold.
