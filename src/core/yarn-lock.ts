import fs from 'fs'
import { DependencyGraph, DependencyNode } from '../types.js'

function nodeKey(name: string, version: string) {
  return `${name}@${version}`
}

type YarnEntry = {
  name: string
  version: string
  resolved?: string
  integrity?: string
  dependencies: Map<string, string>
}

function parseHeaderNames(line: string) {
  const cleaned = line.replace(/:$/, '')
  return cleaned.split(',').map(part => part.trim().replace(/^"|"$/g, ''))
}

function parseYarnLockContent(content: string): YarnEntry[] {
  const entries: YarnEntry[] = []
  const lines = content.split(/\r?\n/)

  let i = 0
  while (i < lines.length) {
    let line = lines[i]
    if (!line || line.trim() === '') {
      i += 1
      continue
    }

    if (!line.includes(':')) {
      i += 1
      continue
    }

    const headerNames = parseHeaderNames(line)
    i += 1

    const entry: YarnEntry = {
      name: '',
      version: '',
      dependencies: new Map()
    }

    while (i < lines.length) {
      line = lines[i]
      if (!line || line.trim() === '') {
        i += 1
        break
      }
      if (!line.startsWith('  ')) break

      const trimmed = line.trim()
      if (trimmed.startsWith('version ')) {
        entry.version = trimmed.slice('version '.length).replace(/^"|"$/g, '')
      } else if (trimmed.startsWith('resolved ')) {
        entry.resolved = trimmed.slice('resolved '.length).replace(/^"|"$/g, '')
      } else if (trimmed.startsWith('integrity ')) {
        entry.integrity = trimmed.slice('integrity '.length).replace(/^"|"$/g, '')
      } else if (trimmed.startsWith('dependencies:')) {
        i += 1
        while (i < lines.length) {
          const depLine = lines[i]
          if (!depLine.startsWith('    ')) break
          const depTrimmed = depLine.trim()
          const space = depTrimmed.indexOf(' ')
          if (space > 0) {
            const depName = depTrimmed.slice(0, space)
            const depRange = depTrimmed.slice(space + 1).replace(/^"|"$/g, '')
            entry.dependencies.set(depName, depRange)
          }
          i += 1
        }
        continue
      }
      i += 1
    }

    const name = pickPrimaryName(headerNames)
    if (name && entry.version) {
      entry.name = name
      entries.push(entry)
    }
  }

  return entries
}

function pickPrimaryName(headers: string[]) {
  if (headers.length === 0) return null
  const first = headers[0]
  const at = first.lastIndexOf('@')
  if (first.startsWith('@')) {
    return at > 0 ? first.slice(0, at) : null
  }
  return at > 0 ? first.slice(0, at) : first
}

export function parseYarnLock(filePath: string): DependencyGraph {
  const raw = fs.readFileSync(filePath, 'utf8')
  const nodes = new Map<string, DependencyNode>()

  for (const entry of parseYarnLockContent(raw)) {
    const node: DependencyNode = {
      name: entry.name,
      version: entry.version,
      dependencies: entry.dependencies,
      integrity: entry.integrity,
      resolved: entry.resolved
    }
    nodes.set(nodeKey(node.name, node.version), node)
  }

  return { nodes, roots: [] }
}
