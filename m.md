# Nuclear Surgical Prompt — SlopGuard Full-System Destructive Validation & Failure Discovery Phase

## ROLE

You are a principal-level:

* infrastructure reliability engineer
* OSS hardening specialist
* deterministic systems auditor
* supply-chain security engineer
* chaos-testing architect
* release engineering auditor
* CI/CD failure-analysis specialist
* monorepo validation engineer

You are conducting a:

# full-system destructive validation audit

for **SlopGuard**.

The goal is NOT feature development.

The goal is:

# discovering every hidden failure point

# detecting operational breakage

# exposing architectural weaknesses

# surfacing nondeterminism

# revealing edge-case instability

# identifying runtime regressions

# exposing hidden CI fragility

# detecting broken dependency paths

# finding release inconsistencies

# locating scalability bottlenecks

This is:

# infrastructure stress verification

NOT:

# product expansion

---

# PRIMARY OBJECTIVE

Perform a complete destructive systems audit of SlopGuard to identify:

* breaking points
* runtime crashes
* dependency failures
* CI instability
* graph traversal bugs
* monorepo edge-case failures
* reproducibility drift
* nondeterministic behavior
* invalid exports
* hidden packaging defects
* workspace traversal inconsistencies
* race conditions
* stale dependency assumptions
* policy enforcement inconsistencies
* memory leaks
* recursion instability
* install enforcement failures
* artifact verification mismatches
* provenance inconsistencies
* MCP startup failures
* lockfile parser weaknesses
* malformed package handling
* performance collapse points

Goal:

# expose ALL hidden operational weaknesses before production release

---

# CRITICAL EXECUTION RULES

DO NOT:

* add features
* redesign architecture
* rewrite systems
* simplify tests
* suppress failures
* ignore warnings
* bypass failing logic
* hide flaky behavior

DO:

* aggressively stress the system
* intentionally break assumptions
* maximize edge-case coverage
* force invalid states
* test malformed inputs
* test corrupted graphs
* test pathological monorepos
* test deterministic guarantees

This phase is:

# adversarial infrastructure validation

---

# VALIDATION STRATEGY

# CRITICAL

Treat SlopGuard as:

# production infrastructure under hostile conditions

The audit must:

* intentionally push limits
* intentionally create failure conditions
* intentionally inject malformed states
* intentionally stress recursion depth
* intentionally test graph explosions
* intentionally attack deterministic guarantees

---

# PHASE 1 — FULL REPOSITORY STRUCTURAL AUDIT

# CRITICAL

Audit ALL:

* files
* folders
* exports
* entrypoints
* scripts
* workflows
* configs
* package surfaces

Detect:

* orphaned files
* unused scripts
* broken imports
* circular dependencies
* invalid exports
* stale configs
* duplicate implementations
* dead code
* shadowed files
* missing build outputs
* unstable entrypoints
* incorrect package.json fields

---

# REQUIRED CHECKS

Validate:

* package.json correctness
* export map consistency
* bin entry correctness
* tsconfig correctness
* workflow references
* script references
* import resolution
* ESM compatibility
* Node 20+ compatibility

---

# REQUIRED FAILURE REPORTING

Need deterministic reporting like:

```txt id="jlwmvv"
STRUCTURAL FAILURE DETECTED

Broken export:
src/core/resilience.ts

Duplicate implementation:
request-manager.ts

Unused workflow:
reproducibility.yml

Invalid bin mapping:
package.json -> slopguard
```

---

# PHASE 2 — FULL CLI DESTRUCTIVE TESTING

# CRITICAL

Aggressively stress:

```bash id="jlwmyb"
slopguard check
slopguard scan
slopguard install
```

---

# TEST CASES

Must test:

* malformed package names
* invalid semver
* missing lockfiles
* corrupted package.json
* cyclic workspace references
* huge dependency graphs
* nonexistent registries
* offline mode
* malformed overrides
* corrupted hotlists
* invalid policies
* malformed configs
* invalid MCP requests
* broken workspaces
* duplicate package names

---

# REQUIRED FAILURE DETECTION

Detect:

* crashes
* hangs
* infinite recursion
* memory explosions
* nondeterministic outputs
* race conditions
* timeout failures
* inconsistent policy decisions

---

# PHASE 3 — MONOREPO CHAOS TESTING

# CRITICAL

Generate pathological workspace structures.

Need stress tests for:

* deeply nested pnpm workspaces
* Turborepo-like graphs
* Nx-like graphs
* cyclic workspace references
* duplicated workspace names
* invalid graph edges
* recursive dependencies
* massive lockfiles
* corrupted lockfiles

---

# REQUIRED METRICS

Measure:

* memory usage
* traversal time
* recursion depth
* graph consistency
* dedupe correctness
* traversal determinism

---

# REQUIRED FAILURE OUTPUT

Need deterministic reports like:

```txt id="jlwmwk"
MONOREPO FAILURE DETECTED

Workspace cycle:
packages/a -> packages/b -> packages/a

Traversal instability:
graph.ts line 183

Memory spike:
2.3GB peak usage

Lockfile parser failure:
pnpm-lock.ts
```

---

# PHASE 4 — REPRODUCIBILITY ATTACK TESTING

# CRITICAL

Attempt to BREAK deterministic guarantees.

Must test:

* randomized timestamps
* altered environments
* reordered files
* modified lockfiles
* altered tarball ordering
* unstable package metadata
* inconsistent path separators
* OS-level differences

---

# REQUIRED DETECTIONS

Detect:

* hash drift
* tarball drift
* inconsistent builds
* unstable digests
* nondeterministic packaging

---

# PHASE 5 — PACKAGE AUDIT ATTACK TESTING

# CRITICAL

Attempt to bypass package-audit.ts.

Inject:

* hidden secrets
* large binaries
* disguised artifacts
* malformed export maps
* hidden .env files
* invalid tarball structures
* oversized source maps
* nested temp artifacts

---

# REQUIRED VALIDATION

Ensure audit engine catches:

* ALL blocked artifacts
* ALL export inconsistencies
* ALL secret leaks
* ALL oversized assets

---

# PHASE 6 — PROVENANCE + INTEGRITY ATTACK TESTING

# CRITICAL

Attempt to break integrity verification.

Inject:

* invalid hashes
* altered provenance statements
* mismatched tarballs
* corrupted attestations
* missing provenance
* altered subject digests

---

# REQUIRED VALIDATION

Ensure integrity verification:

* fails deterministically
* reports exact failure source
* never silently passes
* never produces false positives

---

# PHASE 7 — MCP + POLICY CHAOS TESTING

# CRITICAL

Stress:

* malformed MCP requests
* invalid policy schemas
* corrupted overrides
* invalid trust levels
* conflicting policies
* malformed workspace rules

---

# REQUIRED VALIDATION

Detect:

* inconsistent decisions
* policy nondeterminism
* silent overrides
* unstable enforcement

---

# PHASE 8 — CI/CD DETERMINISM AUDIT

# CRITICAL

Audit ALL workflows for:

* floating versions
* nondeterministic caches
* unstable installs
* race conditions
* environment inconsistencies
* missing gates
* unpinned actions

---

# REQUIRED OUTPUT

Need reports like:

```txt id="jlwmzd"
CI DETERMINISM FAILURE

Floating action:
actions/setup-node@v4

Nondeterministic cache key:
release.yml line 48

Missing release gate:
integrity verification
```

---

# PHASE 9 — PERFORMANCE COLLAPSE TESTING

# CRITICAL

Stress:

* huge dependency graphs
* massive lockfiles
* recursive installs
* concurrent validations
* high parallelism
* slow registries
* network degradation

---

# REQUIRED METRICS

Collect:

* latency
* memory usage
* concurrency stability
* retry behavior
* timeout behavior
* circuit-breaker correctness

---

# REQUIRED FAILURE CLASSIFICATION

Classify ALL failures as:

* CRITICAL
* HIGH
* MEDIUM
* LOW

Include:

* exact file
* exact function
* exact line
* reproduction steps
* root-cause analysis
* deterministic fix recommendation

---

# REQUIRED FINAL OUTPUT

Generate a final audit report like:

```txt id="jlwn02"
SLOPGUARD INFRASTRUCTURE AUDIT

Structural Integrity: PASS
CLI Stability: PASS
Workspace Traversal: PASS
Reproducibility: PASS
Package Audit: PASS
Integrity Verification: PASS
Policy Determinism: PASS
CI Determinism: FAIL
Monorepo Stability: WARNING

Critical Failures: 1
High Severity: 2
Medium Severity: 5
Low Severity: 11

Top Risks:
- Unpinned workflow action
- Recursive graph memory spike
- Tarball ordering nondeterminism
```

---

# MOST IMPORTANT ENGINEERING PRIORITIES

Priority order:

1. Deterministic behavior
2. Runtime stability
3. Release integrity
4. Provenance correctness
5. Monorepo resilience
6. CI reproducibility
7. Operational predictability

---

# FINAL EXECUTION DIRECTIVE

Conduct a full adversarial infrastructure audit of SlopGuard designed to expose:

* every hidden bug
* every breaking point
* every operational weakness
* every nondeterministic path
* every release inconsistency
* every CI fragility
* every graph traversal edge case
* every runtime instability

The system must be stress-tested as if it were:

# mission-critical production infrastructure

Do NOT optimize for:

* passing tests
* clean logs
* optimistic assumptions

Optimize ONLY for:

# truth

# failure discovery

# operational realism

# infrastructure survivability

The final result should provide:

* exact weak points
* exact break locations
* exact reproduction steps
* exact root causes
* exact stabilization recommendations

so the project can be hardened into:

# ecosystem-grade trusted infrastructure.
