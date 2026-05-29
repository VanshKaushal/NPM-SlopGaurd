# REPRODUCIBILITY MODEL RFC

## 1. Abstract
This document details the exact mechanism by which SlopGuard enforces byte-for-byte reproducible installations across all consumer environments.

## 2. Tarball Hashing
All incoming tarballs are hashed using SHA-512. The hash must strictly match the integrity field of the deterministic lockfile. Any mismatch results in an immediate hard-fail.

## 3. Timestamp Normalization
To prevent metadata drift, all extracted files undergo timestamp normalization to the epoch time defined in the `package.json` or standard POSIX epoch prior to caching.

## 4. Environment Sandboxing
During execution, SlopGuard restricts the availability of ambient environment variables to ensure local machine configurations do not bleed into the reproducibility outcome.
