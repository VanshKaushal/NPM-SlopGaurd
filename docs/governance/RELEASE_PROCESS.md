# RELEASE PROCESS RFC

## 1. Deterministic Releases
Every SlopGuard release is deterministically built via a strict CI pipeline. The pipeline ensures the resulting binaries are mathematically identical regardless of the runner.

## 2. Release Steps
1. **Source Freeze**: The repository is tagged and locked.
2. **Deterministic Build**: The build process runs without ambient environment variables.
3. **Artifact Hashing**: SHA-512 hashes are generated for all outputs.
4. **Attestation Generation**: SLSA Level 3 attestations are created via sigstore.
5. **Publish**: Artifacts are published to NPM and GitHub Releases exclusively by automated systems.

## 3. Human Intervention
Human developers cannot locally build and publish official releases. All releases strictly originate from the CI pipeline to maintain trust boundaries.
