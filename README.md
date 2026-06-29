<div align="center">

<img width="800" src="https://capsule-render.vercel.app/api?type=waving&color=timeGradient&height=220&section=header&text=SlopGuard&fontSize=80&fontAlignY=35&desc=Zero-infrastructure%20npm%20package%20validation%20firewall&descAlignY=55&descAlign=50" />

<br/>

[![npm version](https://img.shields.io/npm/v/@vanshkaushal/slopguard?color=blue&style=for-the-badge)](https://www.npmjs.com/package/@vanshkaushal/slopguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-success?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)

**Detects hallucinated, typosquatted, or otherwise high-risk packages and blocks or warns before install.**

</div>

<br/>

## 🎯 What is SlopGuard?

**SlopGuard** is your first line of defense against supply chain attacks in the npm ecosystem. It is a security firewall that checks if a dependency is safe *before* you install it. 

Whether it's typosquatting, malicious install scripts, suspicious new publishers, or hallucinated packages suggested by an AI, SlopGuard catches it. Best of all? **It operates entirely without standing infrastructure.** Run it locally, in your CI/CD pipelines, or as an MCP server.

---

## ⚡ Quick Start

You don't even need to install it. Scan any project instantly using `npx`:

```bash
npx @vanshkaushal/slopguard@alpha scan
```

---

## 💻 Commands Reference

Use SlopGuard's CLI to take control of your dependency graph.

| Command | Description | Example |
| :--- | :--- | :--- |
| `check <pkg>` | Validate a single package against your security policy | `npx @vanshkaushal/slopguard@alpha check react@18.2.0` |
| `scan` | Scan all packages listed in your current `package.json` | `npx @vanshkaushal/slopguard@alpha scan` |
| `scan --recursive` | Deep scan the full dependency graph from your lockfile | `npx @vanshkaushal/slopguard@alpha scan --recursive` |
| `scan-workspace` | Scan all packages across a monorepo workspace | `npx @vanshkaushal/slopguard@alpha scan-workspace` |
| `install <pkg>` | Proxy `npm install` with a strict pre-install validation | `npx @vanshkaushal/slopguard@alpha install lodash` |

<details>
<summary><b>🛠️ View all available CLI flags</b> (Click to expand)</summary>

- `--output=json|sarif` — Output scan results in JSON or SARIF format for CI/CD integration.
- `--json` — Alias for `--output=json`
- `--sarif` — Alias for `--output=sarif`
- `--policy=<mode>` — Override the active policy mode (see Policy Modes below).
- `--offline` — Run in offline mode (skips registry checks, applies a 50% score penalty).
- `--dry-run` — For the `install` command: validates without actually installing.
- `--allow` — Temporarily allow a flagged package for the current run.
- `--ignore-warnings` — Treat warnings as a success (exit code `0`).
- `--verify-integrity=shallow|deep|false` — Control lockfile integrity verification.

</details>

---

## 🛡️ Policy Modes

Every environment has different security needs. SlopGuard ships with built-in policy packs tailored to your strictness level. Pass them via the `--policy=<mode>` flag:

- 🟢 `permissive`: Minimal blocking, mostly warnings. Perfect for experimentation.
- 🟡 `balanced`: **(Default)** The sweet spot between strict security and daily usability.
- 🟠 `strict`: Tighter controls. Strongly recommends provenance for all packages.
- 🔴 `paranoid`: Maximum strictness. Instantly blocks new packages and any missing provenance.
- 🏛️ `enterprise-policy`: For regulated environments. Requires lockfiles, limits maximum risk, and enforces strict age limits.
- 🏦 `fintech-policy`: For financial services. Includes enterprise controls + deep integrity checks and substring blocking.
- 🤖 `ai-agent-policy`: Tailored for AI/ML pipelines. Relaxes provenance for scoped AI ecosystem packages.
- 🔒 `ci-lockdown-policy`: For reproducible CI environments. Frozen lockfiles, fails closed, and blocks install scripts.

---

## 🚦 Exit Codes (CI/CD Ready)

SlopGuard returns deterministic exit codes, making it a breeze to plug into your CI/CD pipelines.

| Code | Status | Meaning |
| :---: | :--- | :--- |
| **`0`** | 🟢 **Safe** | All packages passed checks safely. |
| **`1`** | 🟡 **Warning** | One or more packages triggered non-fatal issues (e.g., missing provenance on an old package). |
| **`2`** | 🔴 **Blocked** | One or more packages are hard-blocked (unsafe to install). |
| **`3`** | 💀 **Error** | Internal error or system crash. |

---

## 🤖 AI Integration (MCP Server)

SlopGuard natively supports the **Model Context Protocol (MCP)**, meaning it can be plugged directly into AI Agents to prevent them from hallucinating non-existent or typosquatted packages!

Start the stdio-compatible server:
```bash
node ./dist/mcp.js
```

### Supported MCP Tool Calls:
- `check_package` — inputs `{ package, allow?, ignoreWarnings? }`
- `scan_package_json` — inputs `{ cwd? }`

<details>
<summary><b>Example configuration for an MCP client</b></summary>

```json
{
  "mcpServers": {
    "slopguard": {
      "command": "node",
      "args": ["/path/to/slopguard/dist/mcp.js"]
    }
  }
}
```
</details>

---

## 🐙 GitHub Action

We provide a plug-and-play GitHub action to secure your repositories automatically on every PR.

```yaml
uses: VanshKaushal/NPM-SlopGaurd@main
with:
  mode: warn
  path: .
  concurrency: 10
```

---

## ⚙️ Configuration

Want to customize the rules? Create a `slopguard.config.js` in the root of your project to override the default behavior.

```js
export default {
  thresholds: {
    publisherAgeDays: 30,     // Flag publishers newer than 30 days
    versionAgeHours: 48,      // Flag versions newer than 48 hours
    downloadVelocityMin: 200  // Flag if weekly downloads are too low
  },
  allowlist: [],
  ignored: [],
  disableSignals: {},
  offline: false,
  strict: false
}
```

---

## 🤝 Contributing

We welcome contributions! To get started with local development:

1. **Clone and install:** `npm install`
2. **Build TypeScript:** `npm run build`
3. **Run in dev mode:** `npm run dev`
4. **Run test suite:** `npm test`

For detailed guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

<div align="center">
  <sub>Built with ❤️ for a safer open-source ecosystem.</sub>
</div>
