# COMPATIBILITY PROMISE RFC

## 1. Abstract
This document outlines SlopGuard's commitment to maintaining cross-environment stability across enterprise ecosystems.

## 2. Package Manager Compatibility
SlopGuard guarantees ongoing deterministic compatibility with the following package managers:
* NPM (v8, v9, v10)
* Yarn (v1, v3, v4)
* pnpm (v8, v9)

## 3. Breaking Changes
Changes to policy engine evaluation logic or lockfile parsing strictness are strictly bound to major version bumps. We will not silently alter enforcement boundaries in minor or patch releases.

## 4. Platform Support
Node.js LTS versions are strictly supported. End-of-Life Node versions will be gracefully deprecated only during major version boundaries.
