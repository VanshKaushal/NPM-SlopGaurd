# SlopGuard

SlopGuard is a zero-infrastructure npm package validation firewall. It blocks hallucinated or hotlisted packages and warns on risky signals before install.

## Quick start

```bash
npm install
npm run build
node ./dist/cli.js check react
```

## CLI

Validate a single package:

```bash
node ./dist/cli.js check react
node ./dist/cli.js check react@18.2.0
```

Scan `package.json` in the current folder:

```bash
node ./dist/cli.js scan
```

Flags:

- `--allow` allowlist a package for a single run
- `--ignore-warnings` treat warnings as success

Exit codes:

```txt
0 = safe
1 = blocked
2 = warnings only
```

## MCP server

Run the MCP server (stdio):

```bash
node ./dist/mcp.js
```

Tools:

- `check_package` inputs: `{ package, allow?, ignoreWarnings? }`
- `scan_package_json` inputs: `{ cwd? }`

Both return JSON serialized as text to stay compatible with strict MCP content typing.

## GitHub Action

`action.yml` uses the compiled `dist/action.js` entrypoint.

Example workflow:

```yaml
name: SlopGuard
on:
	pull_request:
jobs:
	slopguard:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v4
			- uses: ./.
				with:
					mode: warn
					path: .
					concurrency: 10
```

## MCP config

Example MCP client entry:

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

## Architecture

Single validation core lives in `src/core` and is reused by CLI, MCP, and Action.

Signals:

1. Registry existence (hard block)
2. Publisher account age (warn)
3. Version age (warn)
4. Download velocity (warn)
5. Hallucination hotlist (hard block, local JSON)
6. Provenance attestation (warn)

## Threat model

SlopGuard is designed to stop:

- AI hallucinated package names
- Typosquatted packages
- Freshly weaponized packages with low trust signals

It is intentionally conservative: only non-existent or hotlisted packages hard-fail by default.

## False-positive philosophy

SlopGuard only hard-blocks when the package is missing or confirmed on the hotlist. All other signals are warnings by default to minimize disruption.

## Slopsquatting examples

Common typos seen in the wild:

- `reacts`
- `expresss`
- `lodsh`

## Configuration

Create `slopguard.config.js` to customize thresholds and behavior. A sample is included in the repo root.

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

## Hotlist

Edit `src/data/hotlist.json` with entries like:

```json
[
	{
		"name": "reacts",
		"source": "example",
		"confidence": 0.9,
		"notes": "Common typo"
	}
]
```

## GIF demo

Add a short terminal demo GIF here once CLI UX is finalized.

## Contributing

See CONTRIBUTING.md for contribution workflow and hotlist rules.
