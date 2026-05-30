# Changelog

## 0.1.0-alpha.1 — May 2026

First public alpha release.

### Security Fixes
- Fail-closed circuit breaker
- Offline mode score penalty (max 55/100)
- Lockfile integrity verification
- npm:alias blocklist bypass closed
- Git mutable reference hard block
- Tiered scoped package blocklist matching

### Features
- 8 policy modes: permissive, balanced, strict, paranoid,
  enterprise-policy, fintech-policy, ai-agent-policy, ci-lockdown-policy
- JSON output via --output=json
- SARIF 2.1.0 output via --output=sarif
- Deterministic trace IDs on every scan
- Yarn Berry lockfile support (non-PnP)
- Cross-platform: Windows, macOS, Linux

### Known Limitations
See KNOWN-ISSUES.md