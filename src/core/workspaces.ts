import fs from 'fs'
import path from 'path'
import { listPackageJsonFiles } from './manifests.js'

type WorkspaceInfo = {
  rootDir: string
  packageJsonFiles: string[]
}

const WORKSPACE_MARKERS = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json']

function isFsRoot(dir: string) {
  const parent = path.dirname(dir)
  return parent === dir
}

function hasFile(dir: string, file: string) {
  return fs.existsSync(path.join(dir, file))
}

function readWorkspacePatterns(rootDir: string): string[] | null {
  const pkgPath = path.join(rootDir, 'package.json')
  if (!fs.existsSync(pkgPath)) return null
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8')
    const json = JSON.parse(raw) as any
    const workspaces = json.workspaces
    if (Array.isArray(workspaces)) return workspaces
    if (workspaces?.packages && Array.isArray(workspaces.packages)) return workspaces.packages
    return null
  } catch {
    return null
  }
}

function findWorkspaceRoot(cwd: string) {
  let current = cwd
  while (true) {
    const patterns = readWorkspacePatterns(current)
    if (patterns && patterns.length) return current
    for (const marker of WORKSPACE_MARKERS) {
      if (hasFile(current, marker)) return current
    }
    if (isFsRoot(current)) break
    current = path.dirname(current)
  }
  return null
}

function patternToRegExp(pattern: string) {
  const escaped = pattern
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*\*/g, '___DOUBLE_STAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLE_STAR___/g, '.*')
  return new RegExp(`^${escaped}$`)
}

function expandWorkspaceGlobs(rootDir: string, patterns: string[]) {
  const files = listPackageJsonFiles(rootDir)
  const matches: string[] = []
  const rels = files.map(file => ({ file, rel: path.relative(rootDir, path.dirname(file)) }))

  const regexes = patterns.map(patternToRegExp)
  for (const item of rels) {
    if (regexes.some(rx => rx.test(item.rel))) matches.push(item.file)
  }

  const rootPackageJson = path.join(rootDir, 'package.json')
  if (fs.existsSync(rootPackageJson) && !matches.includes(rootPackageJson)) {
    matches.push(rootPackageJson)
  }
  return matches
}

export function discoverWorkspaces(cwd: string): WorkspaceInfo {
  const rootDir = findWorkspaceRoot(cwd) ?? cwd
  const patterns = readWorkspacePatterns(rootDir)
  if (patterns && patterns.length) {
    return {
      rootDir,
      packageJsonFiles: expandWorkspaceGlobs(rootDir, patterns)
    }
  }

  return {
    rootDir,
    packageJsonFiles: listPackageJsonFiles(rootDir)
  }
}
