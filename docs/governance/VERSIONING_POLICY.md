# VERSIONING POLICY RFC

## 1. Abstract
SlopGuard adheres strictly to Semantic Versioning (SemVer) 2.0.0. Given our role as a supply-chain firewall, we define "breaking changes" with extreme prejudice.

## 2. Breaking Changes (MAJOR)
* Modifications to the deterministic hashing algorithm.
* Alterations to the default `strictness` evaluation logic in the Policy Engine.
* Dropping support for Node.js LTS versions.

## 3. Features (MINOR)
* Adding support for new lockfile versions (e.g., NPM v11).
* Introducing new optional governance rules to the Policy Engine.

## 4. Patches (PATCH)
* Security vulnerability mitigations.
* Performance optimizations that do not affect the determinism output.
