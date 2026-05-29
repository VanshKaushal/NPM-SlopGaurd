# THREAT MODEL RFC

## 1. Abstract
This document outlines the operational threat boundaries for the SlopGuard supply-chain governance firewall. It defines the specific adversarial vectors that SlopGuard is designed to mitigate during deterministic resolution.

## 2. In-Scope Threats
* **Malicious Lockfile Injection:** Intentional modification of `package-lock.json` to bypass integrity verification.
* **Registry Spoofing:** Subversion of the NPM registry to serve altered tarballs.
* **Dependency Confusion:** Exploiting namespace boundaries to install malicious internal packages.
* **Pre-Release Poisoning:** Injecting alpha/beta tags into deterministic resolution trees to bypass strict CI checks.

## 3. Out-of-Scope Threats
* Developer workstation compromise via local binary execution outside the NPM lifecycle.
* Zero-day vulnerabilities in the Node.js V8 runtime engine itself.

## 4. Mitigation Strategies
* Strict signature verification on all fetched tarballs before execution.
* Provenance verification enforcement preventing execution of unauthenticated builds.
* Deterministic traversal ensuring lockfile structure cannot deviate from source graph boundaries.
