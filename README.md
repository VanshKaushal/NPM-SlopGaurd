<div align="center">
  
# 🛡️ SlopGuard

**Zero-infrastructure npm package validation firewall.**

[![npm version](https://img.shields.io/npm/v/@vanshkaushal/slopguard?color=blue&style=for-the-badge)](https://www.npmjs.com/package/@vanshkaushal/slopguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-success?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)

*Detects hallucinated, typosquatted, or otherwise high-risk packages and blocks or warns before install.*

</div>

---

## ⚡ Quick Start

You can scan any existing project instantly without installing SlopGuard locally. 

```bash
npx @vanshkaushal/slopguard@alpha scan
```

---

## 🔍 What it does

SlopGuard is a security firewall for npm packages. Before you install a dependency, SlopGuard checks if it is safe — screening for typosquatting, malicious install scripts, suspicious publishers, and supply-chain attacks. It operates entirely without standing infrastructure and can be used locally, in CI/CD, or as an MCP server.

---

## 💻 Commands Reference

| Command | Description | Example |
| :--- | :--- | :--- |
| `check <pkg[@version]>` | Validate a single package against policy | `npx @vanshkaushal/slopguard@alpha check react@18.2.0` |
| `scan` | Scan all packages in the current `package.json` | `npx @vanshkaushal/slopguard@alpha scan` |
| `scan --recursive` | Scan the full dependency graph from lockfile | `npx @vanshkaushal/slopguard@alpha scan --recursive` |
| `scan-workspace` | Scan all packages in a monorepo workspace | `npx @vanshkaushal/slopguard@alpha scan-workspace` |
| `install <pkg>` | Proxy npm install with pre-install validation | `npx @vanshkaushal/slopguard@alpha install lodash` |

<details>
<summary><b>🛠️ View all available flags</b> (Click to expand)</summary>

- `--output=json|sarif` — Output scan results in JSON or SARIF format
- `--json` — Alias for `--output=json`
- `--sarif` — Alias for `--output=sarif`
- `--policy=<mode>` — Override the active policy mode (see Policy Modes below)
- `--offline` — Run in offline mode (skip registry checks, 50% score penalty)
- `--dry-run` — For `install`: validate without actually installing
- `--allow` — Temporarily allow a package for this run
- `--ignore-warnings` — Treat warnings as success (exit code 0)
- `--verify-integrity=shallow|deep|false` — Control lockfile integrity verification

</details>

---

## 🛡️ Policy Modes

SlopGuard comes with several built-in policy packs to suit different environments. Pass them via `--policy=<mode>`:

- `permissive`: Minimal blocking, warnings only (for experimentation)
- `balanced`: **(Default)** Balanced between strictness and usability
- `strict`: Tighter controls, provenance recommended
- `paranoid`: Maximum strictness. Blocks new packages and missing provenance
- `enterprise-policy`: Regulated enterprise environments (requires lockfile, limits max risk, enforces strict age limits)
- `fintech-policy`: Financial services (enterprise controls + deep integrity checks and substring blocking)
- `ai-agent-policy`: AI/ML pipeline use (relaxed provenance, allows scoped AI ecosystem packages)
- `ci-lockdown-policy`: Reproducible CI (frozen lockfiles, fails closed, blocks install scripts)

---

## 🚦 Exit Codes

SlopGuard returns deterministic exit codes for easy CI/CD integration:

| Code | Status | Meaning |
| :---: | :--- | :--- |
| **`0`** | 🟢 **Safe** | All packages passed checks safely. |
| **`1`** | 🟡 **Warning** | One or more packages trigger non-fatal issues. |
| **`2`** | 🔴 **Blocked** | One or more packages are hard-blocked (unsafe). |
| **`3`** | 💀 **Error** | Internal error or crash. |

---

## ⚙️ Local Development (Install & Build)

> **Requirements:** Node.js >= 18.0.0

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Build TypeScript output:**
   ```bash
   npm run build
   ```
3. **Run in development (no build):**
   ```bash
   npm run dev
   ```

---

## 🤖 MCP Server (Model Context Protocol)

SlopGuard can be used as a stdio-compatible MCP server for AI Agents!

```bash
node ./dist/mcp.js
```

**Supported tool calls:**
- `check_package` — inputs `{ package, allow?, ignoreWarnings? }`
- `scan_package_json` — inputs `{ cwd? }`

<details>
<summary><b>Example MCP client entry (mcp config)</b></summary>

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
</details>

---

## 🐙 GitHub Action

This repository includes `action.yml` and a compiled action entrypoint.

```yaml
uses: ./.
with:
  mode: warn
  path: .
  concurrency: 10
```

---

## 📝 Configuration

Create `slopguard.config.js` in the repo root to override behavior. 

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

> **Note on Hotlists:** Hotlist data is kept in `src/data/hotlist.json`. Edit cautiously! 
> Example: `[{ "name": "reacts", "source": "example", "confidence": 0.9, "notes": "common typo" }]`

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution workflow and hotlist rules.

- `npm run build` — compile TypeScript
- `npm run dev` — run `src/cli.ts` via `ts-node` (dev)
- `npm test` — run repository tests (`scripts/run-tests.mjs`)
- `npm run hotlist:validate` — validate hotlist format
