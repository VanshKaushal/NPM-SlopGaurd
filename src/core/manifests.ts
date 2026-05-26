import fs from 'fs'
import path from 'path'

export type ManifestDependencies = {
  name?: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  optionalDependencies: Record<string, string>
  scripts?: Record<string, string>
}

export function readManifest(filePath: string): ManifestDependencies | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const json = JSON.parse(raw) as any
    return {
      name: typeof json.name === 'string' ? json.name : undefined,
      dependencies: json.dependencies ?? {},
      devDependencies: json.devDependencies ?? {},
      peerDependencies: json.peerDependencies ?? {},
      optionalDependencies: json.optionalDependencies ?? {},
      scripts: json.scripts ?? undefined
    }
  } catch {
    return null
  }
}

export function listPackageJsonFiles(root: string) {
  const results: string[] = []
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()!
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      if (entry.isFile() && entry.name === 'package.json') results.push(full)
    }
  }
  return results
}
