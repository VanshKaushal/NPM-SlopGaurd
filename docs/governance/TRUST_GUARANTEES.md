# TRUST GUARANTEES RFC

## 1. Abstract
This is the foundational pledge of SlopGuard to its users, defining the immovable guarantees of the project.

## 2. Core Pledges
1. **Never Compromise Strictness:** We will never introduce features that silently bypass validation checks for "developer convenience."
2. **Never Break Determinism:** The output graph for a specific lockfile and policy state will never change.
3. **No Telemetry:** We will never integrate analytics, telemetry, or network-bound tracking. The infrastructure operates entirely locally and offline, phoning out only to fetch explicit artifacts from the configured registries.
4. **No Cloud Lock-in:** SlopGuard will remain a standalone, self-sufficient binary without dependencies on proprietary cloud backends.
