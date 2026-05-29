# SlopGuard

SlopGuard is a zero-infrastructure npm package validation firewall. It detects hallucinated, typosquatted, or otherwise high-risk packages and blocks or warns before install.

**Requirements:** Node.js >= 20

**Install & build**

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

**Quick usage (CLI)**

- Validate a single package:

```bash
npx slopguard check react
```

- Validate a specific version:

```bash
npx slopguard check react@18.2.0
```

- Scan the current folder's dependencies:

```bash
npx slopguard scan
```

- Recursive workspace scan:

```bash
npx slopguard scan --recursive
```

Commands supported: `check <pkg[@version]>`, `scan`, `scan-workspace`, `install <pkg[@version]>`.

Flags:

- `--allow` — temporarily allow a package for this run
- `--ignore-warnings` — treat warnings as success (exit code 0)

Exit codes:

- `0` = safe
- `1` = hard-blocked (unsafe)
- `2` = warnings only (non-fatal issues)

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
