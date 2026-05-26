# 🚨 SlopGuard

### Zero-Infrastructure npm Package Validation Firewall

> Detect hallucinated, typosquatted, compromised, or high-risk npm packages **before they enter your supply chain**.

---

<div align="center">

![npm](https://img.shields.io/badge/npm-security-red)
![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![typescript](https://img.shields.io/badge/built_with-TypeScript-blue)
![license](https://img.shields.io/badge/license-MIT-purple)
![status](https://img.shields.io/badge/status-active-success)

</div>

---

# 🔥 What is SlopGuard?

SlopGuard is a lightweight security firewall for npm installs.

It analyzes packages using multiple risk signals and blocks suspicious dependencies before installation.

## 🛡️ Detects

* ❌ Hallucinated AI-generated package names
* 🎭 Typosquatted packages
* ☠️ Suspicious publishers
* ⚠️ Freshly published malware
* 📉 Low-trust download patterns
* 🧪 High-risk package anomalies

No infrastructure. No cloud dependency. Just local validation.

---

# ⚡ Requirements

* 🟢 Node.js `>= 20`

---

# 📦 Installation

```bash
npm install
```

---

# 🏗️ Build

Compile TypeScript output:

```bash
npm run build
```

---

# 🧪 Development Mode

Run directly without building:

```bash
npm run dev
```

---

# 🚀 CLI Usage

## ✅ Validate a Single Package

```bash
npx slopguard check react
```

---

## 🔎 Validate a Specific Version

```bash
npx slopguard check react@18.2.0
```

---

## 📂 Scan Current Project Dependencies

```bash
npx slopguard scan
```

---

## 🧱 Recursive Workspace Scan

```bash
npx slopguard scan --recursive
```

---

# 🛠️ Supported Commands

| Command                   | Description             |
| ------------------------- | ----------------------- |
| `check <pkg[@version]>`   | Validate a package      |
| `scan`                    | Scan current project    |
| `scan-workspace`          | Scan monorepo/workspace |
| `install <pkg[@version]>` | Safe install wrapper    |

---

# 🎛️ CLI Flags

| Flag                | Purpose                       |
| ------------------- | ----------------------------- |
| `--allow`           | Temporarily allow a package   |
| `--ignore-warnings` | Convert warnings into success |

---

# 🚦 Exit Codes

| Code | Meaning          |
| ---- | ---------------- |
| `0`  | ✅ Safe           |
| `1`  | ❌ Hard blocked   |
| `2`  | ⚠️ Warnings only |

---

# 🧠 MCP Server (Model Context Protocol)

Run the MCP server:

```bash
node ./dist/mcp.js
```

Compatible with stdio-based MCP clients.

---

## 🔌 Supported MCP Tools

### `check_package`

Inputs:

```json
{
  "package": "react",
  "allow": false,
  "ignoreWarnings": false
}
```

---

### `scan_package_json`

Inputs:

```json
{
  "cwd": "./"
}
```

---

## ⚙️ Example MCP Client Config

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

---

# ⚡ GitHub Action

This repository ships with a built-in GitHub Action.

## 📄 Example Workflow

```yaml
uses: ./.
with:
  mode: warn
  path: .
  concurrency: 10
```

---

# ⚙️ Configuration

Create a `slopguard.config.js` file in your project root.

## 📄 Example

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

---

# 🚨 Hotlist Database

Hotlist data lives in:

```bash
src/data/hotlist.json
```

⚠️ Edit cautiously.

## 📄 Example Entry

```json
[
  {
    "name": "reacts",
    "source": "example",
    "confidence": 0.9,
    "notes": "common typo"
  }
]
```

---

# 📜 Available Scripts

| Script                     | Description                |
| -------------------------- | -------------------------- |
| `npm run build`            | Compile TypeScript         |
| `npm run dev`              | Run CLI in development     |
| `npm test`                 | Run repository tests       |
| `npm run hotlist:validate` | Validate hotlist structure |

---

# 🧩 Project Structure

## 🚪 Entry Points

```bash
src/cli.ts
src/mcp/mcp.ts
src/action.ts
```

---

## 🧠 Core Engine

Reusable validation logic:

```bash
src/core/
```

Used by:

* CLI
* MCP server
* GitHub Action

---

## 🧪 Tests

```bash
tests/
```

Run with:

```bash
npm test
```

---

# 🔒 Security Philosophy

SlopGuard assumes:

> "If a package looks suspicious, treat it as hostile until proven otherwise."

Modern package ecosystems are increasingly attacked through:

* dependency confusion
* typo attacks
* AI hallucinations
* publisher takeovers
* malicious rapid-publish malware

SlopGuard is designed to reduce that attack surface.

---

# 🤝 Contributing

Please read:

```bash
CONTRIBUTING.md
```

Before submitting:

* hotlist changes
* detection heuristics
* validation logic
* new risk signals

---

# 🧭 Roadmap

* [ ] Lockfile deep inspection
* [ ] Registry reputation scoring
* [ ] Package behavior fingerprinting
* [ ] Offline intelligence bundles
* [ ] VSCode extension
* [ ] pnpm/yarn native hooks
* [ ] SARIF security reporting
* [ ] CI risk dashboards

---

# 💡 Example Use Cases

## 🛡️ Secure CI/CD Pipelines

Block malicious dependencies before merge.

---

## 🤖 AI-Assisted Coding Protection

Catch hallucinated package installs from LLM-generated code.

---

## 🧱 Enterprise Monorepo Defense

Scan large workspaces recursively.

---

## 🔬 Security Research

Analyze suspicious npm ecosystem activity.

---

# 📌 Why SlopGuard Exists

AI coding assistants increasingly generate:

* nonexistent packages
* typo packages
* malicious dependencies
* stale package references

Developers copy-paste blindly.

That creates a new supply-chain attack vector.

SlopGuard exists to stop that.

---

# ⭐ Example

```bash
$ npx slopguard check reat

❌ BLOCKED: Possible typosquat detected

Suggested package:
→ react

Confidence:
→ 97%
```

---

# 🧠 Philosophy

Minimal infrastructure.
Maximum paranoia.
Fast local enforcement.

---

# 📄 License

MIT License © 2026
