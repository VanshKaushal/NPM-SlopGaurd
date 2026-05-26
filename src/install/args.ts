export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export type InstallArgs = {
  pkg: string
  allow: boolean
  ignoreWarnings: boolean
  manager?: PackageManager
  offline: boolean
  dryRun: boolean
}

type PackageSpec = { name: string; version?: string }

function isValidSegment(segment: string) {
  if (!segment) return false
  if (segment.startsWith('.')) return false
  if (segment.includes('..')) return false
  return /^[a-z0-9][a-z0-9-._~]*$/i.test(segment)
}

function isValidPackageName(name: string) {
  if (name.startsWith('@')) {
    const parts = name.split('/')
    if (parts.length !== 2) return false
    const scope = parts[0].slice(1)
    const pkg = parts[1]
    return isValidSegment(scope) && isValidSegment(pkg)
  }
  return isValidSegment(name)
}

function isValidVersion(version: string) {
  if (!version) return false
  if (/[\s\\]/.test(version)) return false
  return /^[0-9A-Za-z.+-]+$/.test(version)
}

export function parsePackageSpec(input: string): PackageSpec {
  if (input.startsWith('@')) {
    const at = input.lastIndexOf('@')
    if (at > 0) {
      return { name: input.slice(0, at), version: input.slice(at + 1) }
    }
    return { name: input }
  }
  const [name, version] = input.split('@')
  return { name, version }
}

export function normalizePackageSpec(input: string): { spec: string; name: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[./]|^[A-Za-z]:/.test(trimmed)) return null
  if (/\\/.test(trimmed)) return null
  if (/^(file:|git\+|https?:)/i.test(trimmed)) return null

  const { name, version } = parsePackageSpec(trimmed)
  if (!isValidPackageName(name)) return null
  if (version && !isValidVersion(version)) return null

  return { spec: trimmed, name }
}

function parseManagerValue(value: string): PackageManager | null {
  if (value === 'npm' || value === 'pnpm' || value === 'yarn') return value
  return null
}

export function parseInstallArgs(argv: string[]): { args?: InstallArgs; error?: string } {
  let allow = false
  let ignoreWarnings = false
  let manager: PackageManager | undefined
  let offline = false
  let dryRun = false
  let pkg: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg) continue
    if (!arg.startsWith('--')) {
      if (!pkg) pkg = arg
      else return { error: `Unexpected argument: ${arg}` }
      continue
    }

    if (arg === '--allow') {
      allow = true
      continue
    }
    if (arg === '--ignore-warnings') {
      ignoreWarnings = true
      continue
    }
    if (arg === '--offline') {
      offline = true
      continue
    }
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg === '--manager') {
      const value = argv[i + 1]
      if (!value) return { error: 'Missing value for --manager' }
      const parsed = parseManagerValue(value)
      if (!parsed) return { error: `Unknown manager: ${value}` }
      manager = parsed
      i += 1
      continue
    }

    if (arg.startsWith('--manager=')) {
      const value = arg.slice('--manager='.length)
      const parsed = parseManagerValue(value)
      if (!parsed) return { error: `Unknown manager: ${value}` }
      manager = parsed
      continue
    }

    return { error: `Unknown flag: ${arg}` }
  }

  if (!pkg) return { error: 'Missing package name' }

  const normalized = normalizePackageSpec(pkg)
  if (!normalized) return { error: `Invalid package spec: ${pkg}` }

  return {
    args: {
      pkg: normalized.spec,
      allow,
      ignoreWarnings,
      manager,
      offline,
      dryRun
    }
  }
}
