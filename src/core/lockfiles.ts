import fs from 'fs'
import path from 'path'
import { DependencyGraph } from '../types.js'
import { parsePackageLock } from './package-lock.js'
import { parsePnpmLock } from './pnpm-lock.js'
import { parseYarnLock } from './yarn-lock.js'

export type LockfileType = 'pnpm' | 'yarn' | 'npm'

export type LockfileDetection = {
  type: LockfileType
  path: string
  rootDir: string
}

const LOCKFILE_PRIORITY: Array<{ file: string; type: LockfileType }> = [
  { file: 'pnpm-lock.yaml', type: 'pnpm' },
  { file: 'yarn.lock', type: 'yarn' },
  { file: 'package-lock.json', type: 'npm' }
]

function isFsRoot(dir: string) {
  const parent = path.dirname(dir)
  return parent === dir
}

function hasFile(dir: string, file: string) {
  return fs.existsSync(path.join(dir, file))
}

export function detectLockfile(cwd: string): LockfileDetection | null {
  let current = cwd
  while (true) {
    for (const entry of LOCKFILE_PRIORITY) {
      if (hasFile(current, entry.file)) {
        return {
          type: entry.type,
          path: path.join(current, entry.file),
          rootDir: current
        }
      }
    }
    if (isFsRoot(current)) break
    current = path.dirname(current)
  }
  return null
}

export function parseLockfile(detection: LockfileDetection): DependencyGraph | null {
  try {
    if (detection.type === 'pnpm') return parsePnpmLock(detection.path)
    if (detection.type === 'yarn') return parseYarnLock(detection.path)
    return parsePackageLock(detection.path)
  } catch {
    return null
  }
}
