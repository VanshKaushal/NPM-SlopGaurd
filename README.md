# SlopGuard

SlopGuard is a zero-infrastructure npm package validation firewall. It detects hallucinated, typosquatted, or otherwise high-risk packages and blocks or warns before install.

## Quick Start

```bash
npx @vanshkaushal/slopguard@alpha scan
```

## What it does

SlopGuard is a security firewall for npm packages. Before you install a dependency, SlopGuard checks if it is safe — screening for typosquatting, malicious install scripts, suspicious publishers, and supply-chain attacks.

## Commands reference

- Validate a single package:
```bash
npx @vanshkaushal/slopguard@alpha check react
```

- Validate a specific version:
```bash
npx @vanshkaushal/slopguard@alpha check react@18.2.0
```

- Scan the current folder's dependencies:
```bash
npx @vanshkaushal/slopguard@alpha scan
```

- Recursive workspace scan:
```bash
npx @vanshkaushal/slopguard@alpha scan --recursive
```

Commands supported: `check <pkg[@version]>`, `scan`, `scan-workspace`, `install <pkg[@version]>`.

Flags:
- `--output=json|sarif` — Output scan results in JSON or SARIF format
- `--json` — Alias for `--output=json`
- `--sarif` — Alias for `--output=sarif`
- `--policy=<mode>` — Override the active policy mode (see Policy Modes below)
- `--offline` — Run in offline mode (skip registry checks, 50% score penalty)
- `--dry-run` — For install: validate without actually installing
- `--allow` — Temporarily allow a package for this run
- `--ignore-warnings` — Treat warnings as success (exit code 0)
- `--verify-integrity=shallow|deep|false` — Control lockfile integrity verification

## Policy Modes

SlopGuard comes with several built-in policy packs to suit different environments:
- `permissive`: Minimal blocking, warnings only (for experimentation)
- `balanced`: Default. Balanced between strictness and usability
- `strict`: Tighter controls, provenance recommended
- `paranoid`: Maximum strictness. Blocks new packages and missing provenance
- `enterprise-policy`: Regulated enterprise environments (requires lockfile, limits max risk, enforces strict age limits)
- `fintech-policy`: Financial services (enterprise controls + deep integrity checks and substring blocking)
- `ai-agent-policy`: AI/ML pipeline use (relaxed provenance, allows scoped AI ecosystem packages)
- `ci-lockdown-policy`: Reproducible CI (frozen lockfiles, fails closed, blocks install scripts)

## Exit codes

- `0` = safe
- `1` = warnings only (non-fatal issues)
- `2` = hard-blocked (unsafe)
- `3` = internal error

## Local Development (Install & build)

**Requirements:** Node.js >= 18.0.0

- Install dependencies:
```bash
npm install
```

- Build TypeScript output:
```bash
npm run build
```

- Run in development (no build):
```bash
npm run dev
```



**MCP server (Model Context Protocol)**

Run the MCP server (stdio-compatible):

```bash
node ./dist/mcp.js
```

Supported tool calls:

- `check_package` — inputs `{ package, allow?, ignoreWarnings? }`
- `scan_package_json` — inputs `{ cwd? }`

Both return JSON serialized as text for compatibility.

Example MCP client entry (mcp config):

```json
{
  "mcpServers": {
    "slopguard": {
      "command": "node",
      "args": ["./dist/mcp.js"]
    }
  }
}
```

**GitHub Action**

This repository includes `action.yml` and a compiled action entrypoint (used from `dist/action.js`). Minimal workflow example:

```yaml
uses: ./.
with:
  mode: warn
  path: .
  concurrency: 10
```

**Configuration**

Create `slopguard.config.js` in the repo root to override behavior. Example options:

```js
export default {
  thresholds: {
    publisherAgeDays: 30,
    versionAgeHours: 48,
    downloadVelocityMin: 200
  },
  allowlist: [],
  ignored: [],
  disableSignals: {},
  offline: false,
  strict: false
}
```

Hotlist data is kept in `src/data/hotlist.json` — edit cautiously. A sample entry:

```json
[{ "name": "reacts", "source": "example", "confidence": 0.9, "notes": "common typo" }]
```

**Scripts**

- `npm run build` — compile TypeScript
- `npm run dev` — run `src/cli.ts` via `ts-node` (dev)
- `npm test` — run repository tests (`scripts/run-tests.mjs`)
- `npm run hotlist:validate` — validate hotlist format

**Development notes**

- Entry points: `src/cli.ts`, `src/mcp/mcp.ts`, `src/action.ts`.
- Core validation logic is in `src/core/` and reused by CLI, MCP server, and the GitHub Action.
- Tests live in `tests/` and can be executed with `npm test`.

**Contributing**

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution workflow and hotlist rules.

If you need help running the project locally or want me to add usage examples (GIFs, workflow examples, or expanded MCP docs), tell me which area to expand.
