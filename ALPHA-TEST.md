echo "" > ALPHA-TEST.md

# SlopGuard Alpha Test

Thank you for testing SlopGuard. Takes about 10 minutes.
Requires any existing Node.js project on your machine.

## Requirements
- Node.js 18+ (check: node --version)
- Any existing Node.js project with a package.json

## Setup — No install needed
Everything runs via npx. No cloning. No building.

## Test 1 — Scan your project
cd your-project-folder
npx @vanshkaushal/slopguard@alpha scan

Expected: SlopGuard scans your dependencies and prints results.

## Test 2 — Check a specific package
npx @vanshkaushal/slopguard@alpha check lodash@4.17.21
npx @vanshkaushal/slopguard@alpha check reeact@1.0.0

Expected: lodash passes. reeact gets flagged as suspicious.

## Test 3 — JSON output
npx @vanshkaushal/slopguard@alpha scan --output=json

## Please Report Back
1. OS (Windows/Mac/Linux):
2. Node version:
3. Did Test 1 complete without crashing? Y/N
4. If crashed — paste the full error
5. Did reeact get flagged in Test 2? Y/N
6. Was the output readable? Y/N
7. Anything confusing or wrong?

Report issues: https://github.com/VanshKaushal/NPM-SlopGaurd/issues