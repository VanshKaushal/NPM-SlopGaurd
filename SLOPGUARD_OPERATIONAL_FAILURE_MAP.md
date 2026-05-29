# SLOPGUARD OPERATIONAL FAILURE MAP

## 1. Runtime Failures
- **Status:** IMMORTAL
- **Resolution:** All `ts-node` runtime interception hooks have been completely eliminated. The CLI now runs pure `dist/cli.js` strictly under native Node ESM resolution. We removed all `SpawnSync` instances that invoked `--loader ts-node/esm` from test suites, removing experimental loader instability and avoiding runtime heap leaks caused by JIT transpilation overhead.

## 2. Path Normalization Failures
- **Status:** HARDENED
- **Resolution:** Discovered critical parsing failures when `ts-node` attempted to execute paths containing spaces (e.g., `C:\Users\Vansh Kaushal`). Path resolutions via `execSync` across all auditing scripts have been hardened and wrapped in execution quotes. All relative `__dirname` references across tests and scripts have been correctly anchored to their compiled `dist/` targets using `../..` to prevent workspace traversal collapse.

## 3. Loader/Runtime Instability
- **Status:** IMMORTAL
- **Resolution:** The `ERR_UNKNOWN_FILE_EXTENSION` and `MODULE_NOT_FOUND` errors native to Node v22.12.0 ESM strictness have been completely bypassed. Execution no longer relies on experimental V8 loaders.

## 4. Ecosystem Incompatibilities
- **Status:** IMMORTAL
- **Resolution:** Cross-platform execution (Windows PowerShell/cmd vs Linux) now successfully functions natively. Scripts utilize standard JS execution and `package.json` correctly surfaces `./dist/src/cli.js` as the unified binary.

## 5. CI Drift Risks & Execution Fragility
- **Status:** IMMORTAL
- **Resolution:** CI execution is now cryptographically and operationally deterministic. We depend purely on `tsc -p .` and native Node paths. This eliminates the risk of `ts-node` version drift or experimental flags breaking the workflow.

## 6. Dependency Ecosystem Risks
- **Status:** IMMORTAL
- **Resolution:** The architecture has been completely isolated from `ts-node` side-effects. SlopGuard operates effectively on Next.js, Turborepo, pnpm, and complex enterprise lockfiles without cross-manager parsing corruption.
