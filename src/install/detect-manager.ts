import fs from 'fs'
import path from 'path'
import { PackageManager } from './args.js'

type ManagerDetection = {
  manager: PackageManager
  rootDir: string
  lockfilePath?: string
}

const LOCKFILE_PRIORITY: Array<{ file: string; manager: PackageManager }> = [
  { file: 'pnpm-lock.yaml', manager: 'pnpm' },
  { file: 'yarn.lock', manager: 'yarn' },
  { file: 'package-lock.json', manager: 'npm' }
]

const WORKSPACE_MARKERS = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json']

function isFsRoot(dir: string) {
  const parent = path.dirname(dir)
  return parent === dir
}

function hasFile(dir: string, file: string) {
  return fs.existsSync(path.join(dir, file))
}

function hasWorkspacePackageJson(dir: string) {
  const pkgPath = path.join(dir, 'package.json')
  if (!fs.existsSync(pkgPath)) return false
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8')
    const json = JSON.parse(raw) as any
    return Boolean(json.workspaces)
  } catch {
    return false
  }
}

function findWorkspaceRoot(cwd: string) {
  let current = cwd
  while (true) {
    for (const marker of WORKSPACE_MARKERS) {
      if (hasFile(current, marker)) return current
    }
    if (hasWorkspacePackageJson(current)) return current
    if (isFsRoot(current)) break
    current = path.dirname(current)
  }
  return null
}

export function detectPackageManager(
  cwd: string,
  override?: PackageManager
): ManagerDetection {
  const workspaceRoot = findWorkspaceRoot(cwd) ?? cwd
  if (override) return { manager: override, rootDir: workspaceRoot }

  let current = cwd
  while (true) {
    for (const entry of LOCKFILE_PRIORITY) {
      if (hasFile(current, entry.file)) {
        return {
          manager: entry.manager,
          rootDir: current,
          lockfilePath: path.join(current, entry.file)
        }
      }
    }
    if (isFsRoot(current)) break
    current = path.dirname(current)
  }

  return { manager: 'npm', rootDir: workspaceRoot }
}
