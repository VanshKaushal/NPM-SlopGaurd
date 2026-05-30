You are completing the final pre-alpha documentation gate 
for SlopGuard. The package is published at 
@vanshkaushal/slopguard@alpha on npm.

Read every existing file before creating or modifying anything.
The test suite must still pass 49/49 after all changes.

═══════════════════════════════════════════════════
TASK 1 — CREATE ALPHA-TEST.md (Friend Test Document)
═══════════════════════════════════════════════════

Check if ALPHA-TEST.md already exists. If yes, read it first.
Replace or create with exactly this content, filling in 
any blanks based on actual current CLI behavior:

---
# SlopGuard Alpha Test

Thank you for testing SlopGuard. This takes about 10 minutes
and requires any existing Node.js project on your machine.

## What SlopGuard Does

SlopGuard is a security firewall for npm packages. Before 
you install a dependency, SlopGuard checks if it is safe — 
screening for typosquatting, malicious install scripts, 
suspicious publishers, and supply-chain attacks.

## Requirements

- Node.js 18 or higher (check: node --version)
- Any existing Node.js project with a package.json

## Setup — No install needed

Everything runs via npx. No cloning. No building.

## Test 1 — Scan your project (2 minutes)

Navigate to any of your existing Node projects:

  cd your-project-folder
  npx @vanshkaushal/slopguard@alpha scan

Expected: SlopGuard scans your dependencies and prints 
results for each package. It should complete without crashing.

## Test 2 — Check a specific package (1 minute)

  npx @vanshkaushal/slopguard@alpha check lodash@4.17.21
  npx @vanshkaushal/slopguard@alpha check reeact@1.0.0

Expected: lodash passes. reeact should be flagged as 
suspicious (typosquat of react).

## Test 3 — JSON output (1 minute)

  npx @vanshkaushal/slopguard@alpha scan --output=json

Expected: Clean JSON output. Paste the first 20 lines 
back to me.

## Test 4 — Try a strict policy (1 minute)

  npx @vanshkaushal/slopguard@alpha scan --policy=strict

Expected: Same scan, stricter rules. Note if anything 
gets blocked that passed before.

## Please Report Back

Answer these questions — paste your answers directly 
to me or open a GitHub Issue:

**Environment:**
- OS (Windows / Mac / Linux):
- Node version (node --version):
- Your project's rough size (how many dependencies approx):

**Results:**
1. Did Test 1 complete without crashing? Y/N
2. If it crashed — paste the full error message
3. Did reeact get flagged in Test 2? Y/N
4. Was the output clear and readable? Y/N
5. Anything that confused you or looked wrong?
6. One thing you would change about the output?

**Report issues at:**
https://github.com/VanshKaushal/NPM-SlopGaurd/issues

---

═══════════════════════════════════════════════════
TASK 2 — CREATE KNOWN-ISSUES.md
═══════════════════════════════════════════════════

Check if KNOWN-ISSUES.md already exists. Read it if yes.
Create or update with:

---
# SlopGuard Known Limitations — Alpha v0.1.0-alpha.1

## Not Yet Supported

- **Yarn Berry PnP mode** — Yarn v2+ with PnP enabled has 
  incomplete dependency graph support. Standard Yarn Berry 
  (non-PnP) works correctly.

- **Private registries** — Packages from private npm registries 
  (Artifactory, Verdaccio, GitHub Packages) are not yet supported. 
  They will likely fail existence checks.

- **SBOM export** — CycloneDX and SPDX formats planned for v0.2.0.

- **Revocation checking** — Post-install trust invalidation 
  is planned for v0.2.0.

- **npm shrinkwrap** — npm-shrinkwrap.json is not yet parsed. 
  Use package-lock.json instead.

## Known Behavior

- **Offline mode** applies a score penalty. Packages score 
  maximum 55/100 when --offline is used. This is intentional.

- **Circuit breaker** opens after 5 registry failures. During 
  a registry outage, scores are capped at 55. This is intentional.

- **First scan on large projects** (500+ dependencies) may take 
  2-5 minutes due to registry API rate limits.

- **New packages** (< 30 days old) will score lower. This is 
  intentional — new packages carry higher risk.

## Reporting Issues

Please include:
- Your OS and Node version
- The exact command you ran
- The full terminal output

https://github.com/VanshKaushal/NPM-SlopGaurd/issues

---

═══════════════════════════════════════════════════
TASK 3 — CREATE CHANGELOG.md
═══════════════════════════════════════════════════

Check if CHANGELOG.md exists. Read it if yes.
Create or update with:

---
# Changelog

## 0.1.0-alpha.1 — [INSERT TODAY'S DATE]

First public alpha release.

### Security Fixes
- Fail-closed circuit breaker: registry outages no longer 
  grant perfect trust scores
- Offline mode score penalty: max 55/100 in degraded mode
- Lockfile integrity verification: hash and URL cross-check
- npm:alias blocklist bypass closed
- Git mutable reference hard block (branch refs blocked, 
  SHA refs allowed with warning)
- Tiered scoped package blocklist matching

### Features
- 8 policy modes: permissive, balanced, strict, paranoid,
  enterprise-policy, fintech-policy, ai-agent-policy, 
  ci-lockdown-policy
- JSON output via --output=json
- SARIF 2.1.0 output via --output=sarif
- Deterministic trace IDs on every scan
- Yarn Berry lockfile support (non-PnP)
- Cross-platform: Windows, macOS, Linux

### Known Limitations
See KNOWN-ISSUES.md

---

═══════════════════════════════════════════════════
TASK 4 — CREATE GITHUB ISSUE TEMPLATE
═══════════════════════════════════════════════════

Create file at:
  .github/ISSUE_TEMPLATE/bug_report.md

Content:

---
name: Bug Report
about: Something crashed or behaved unexpectedly
title: '[BUG] '
labels: bug
---

## Environment
- OS: 
- Node version (`node --version`): 
- SlopGuard version (`npx @vanshkaushal/slopguard@alpha --version`): 
- Package manager of scanned project: npm / yarn / pnpm

## Command Run

paste exact command here


## Expected Behavior
What should have happened?

## Actual Behavior
Paste the full terminal output including any errors:

paste output here

## Project Context (optional)
Rough number of dependencies in scanned project:
Any unusual setup (monorepo, workspaces, private registry)?

---

Also create:
  .github/ISSUE_TEMPLATE/feedback.md

Content:

---
name: Alpha Feedback
about: General feedback from alpha testing
title: '[FEEDBACK] '
labels: feedback
---

## What I Tested
Which commands did you run?

## What Worked Well


## What Was Confusing or Broken


## Suggestion


## Environment
- OS:
- Node version:

---

═══════════════════════════════════════════════════
TASK 5 — VERIFY README HAS QUICKSTART
═══════════════════════════════════════════════════

Open README.md. Verify the FIRST section after the title is:

## Quick Start

  npx @vanshkaushal/slopguard@alpha scan

That's it. One command. It must be the first thing 
anyone sees when they open the README.

If the README buries the install command below a wall 
of architecture documentation: move Quick Start to the top.

The README structure must be:
1. Title + one-line description
2. Quick Start (the npx command)
3. What it does (short paragraph)
4. Commands reference
5. Policy modes
6. Exit codes
7. Everything else

Restructure if needed. Do not delete any content —
only reorder it.

═══════════════════════════════════════════════════
FINAL VERIFICATION
═══════════════════════════════════════════════════

After all 5 tasks:

1. npm test → must show 49/49 pass
2. Verify these files exist:
   [ ] ALPHA-TEST.md
   [ ] KNOWN-ISSUES.md  
   [ ] CHANGELOG.md
   [ ] .github/ISSUE_TEMPLATE/bug_report.md
   [ ] .github/ISSUE_TEMPLATE/feedback.md
3. git add . && git commit -m "docs: alpha release documentation"
4. git push

Then run ONE final check:
  npx @vanshkaushal/slopguard@alpha --help

Must still work after the push.

Report back:
- Confirmation all 5 files exist
- npm test result (49/49)
- Any task that could not be completed and why