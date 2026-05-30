# SlopGuard Known Limitations — Alpha v0.1.0-alpha.1

## Not Yet Supported
- Yarn Berry PnP mode — incomplete graph support
- Private registries — will fail existence checks
- SBOM export — planned for v0.2.0
- Revocation checking — planned for v0.2.0
- npm-shrinkwrap.json — use package-lock.json instead

## Known Behavior
- Offline mode caps scores at 55/100 — intentional
- Circuit breaker caps scores at 55 during registry outages — intentional
- Large projects (500+ deps) may take 2-5 minutes — registry rate limits
- New packages (< 30 days old) score lower — intentional

## Reporting Issues
https://github.com/VanshKaushal/NPM-SlopGaurd/issues