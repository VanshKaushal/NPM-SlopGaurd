# PROVENANCE CHAIN RFC

## 1. Abstract
The Provenance Chain defines how SlopGuard establishes an unbroken line of trust from source repository execution to final tarball delivery.

## 2. Attestation Verification
SlopGuard inherently validates SLSA (Supply chain Levels for Software Artifacts) provenance attestations attached to NPM packages. Packages missing required attestations under strict policy modes will be rejected.

## 3. Signature Chains
All artifacts are verified against the NPM public key infrastructure via sigstore. The signature chain ensures that the artifact was unequivocally published by the stated owner.

## 4. Audit Log Integration
Failures in the provenance chain are durably logged with complete context (failed signature, missing attestation) for enterprise audit pipelines.
