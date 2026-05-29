# RELEASE IMMUTABILITY RFC

## 1. Abstract
Release Immutability guarantees that SlopGuard's own binaries and distributed artifacts are tamper-proof and cannot be retroactively modified or compromised.

## 2. Artifact Hashing
Every release of SlopGuard is accompanied by a cryptographic manifest (`shasum256.txt`) detailing the exact hashes of every platform binary.

## 3. Immutable Distribution
SlopGuard enforces that all releases on public registries are treated as append-only. Any attempt to re-publish an existing version will be structurally rejected by the registry's inherent immutability constraints.

## 4. Verification Bootstrapping
Users can verify SlopGuard's own immutability by using the `verify-release` command against the distribution tarball before execution.
