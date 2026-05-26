import fs from 'fs'
import path from 'path'
import { discoverWorkspaces } from '../core/workspaces.js'

const POLICY_FILE = 'slopguard.policy.json'
const ALLOWLIST_FILE = 'slopguard.allowlist.json'
const BLOCKLIST_FILE = 'slopguard.blocklist.json'
const OVERRIDES_FILE = 'slopguard.overrides.json'

export type WorkspacePolicyPaths = {
  rootDir: string
  policyPath?: string
  allowlistPath?: string
  blocklistPath?: string
  overridesPath?: string
}

function exists(filePath: string) {
  return fs.existsSync(filePath)
}

function findNearest(cwd: string, rootDir: string, fileName: string) {
  let current = cwd
  while (true) {
    const candidate = path.join(current, fileName)
    if (exists(candidate)) return candidate
    if (current === rootDir) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return undefined
}

export function resolveWorkspacePolicyPaths(cwd: string): WorkspacePolicyPaths {
  const workspace = discoverWorkspaces(cwd)
  const rootDir = workspace.rootDir

  return {
    rootDir,
    policyPath: findNearest(cwd, rootDir, POLICY_FILE),
    allowlistPath: findNearest(cwd, rootDir, ALLOWLIST_FILE) ?? path.join(rootDir, ALLOWLIST_FILE),
    blocklistPath: findNearest(cwd, rootDir, BLOCKLIST_FILE) ?? path.join(rootDir, BLOCKLIST_FILE),
    overridesPath: findNearest(cwd, rootDir, OVERRIDES_FILE) ?? path.join(rootDir, OVERRIDES_FILE)
  }
}
