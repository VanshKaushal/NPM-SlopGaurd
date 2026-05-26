export type SignalName =
  | 'existence'
  | 'hotlist'
  | 'publisher_age'
  | 'version_age'
  | 'download_velocity'
  | 'provenance'

export type SignalResult = {
  name: SignalName
  hardFail: boolean
  passed: boolean
  message?: string
  meta?: Record<string, any>
}

export type ValidationResult = {
  pkg: string
  version?: string
  hardBlocked: boolean
  warnings: SignalResult[]
  infos: SignalResult[]
  score: number
  raw: Record<string, SignalResult>
}

export type DependencyNode = {
  name: string
  version: string
  dependencies: Map<string, string>
  integrity?: string
  resolved?: string
  dev?: boolean
  optional?: boolean
}

export type DependencyGraph = {
  nodes: Map<string, DependencyNode>
  roots: string[]
}

export type GraphValidationResult = {
  totalPackages: number
  scannedPackages: number
  warnings: number
  blocked: number
  skipped: number
  dependencyDepth: number
  highRiskPackages: string[]
  results: ValidationResult[]
  scriptWarnings?: Array<{ pkg: string; script: string; level: string; reason: string }>
}

export const SIGNAL_WEIGHTS: Record<string, { weight: number; hardFail: boolean }> = {
  existence: { weight: 0, hardFail: true },
  hotlist: { weight: 0, hardFail: true },
  publisher_age: { weight: 30, hardFail: false },
  version_age: { weight: 25, hardFail: false },
  download_velocity: { weight: 25, hardFail: false },
  provenance: { weight: 20, hardFail: false }
}

export type Thresholds = {
  publisherAgeDays: number
  versionAgeHours: number
  downloadVelocityMin: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  publisherAgeDays: 30,
  versionAgeHours: 48,
  downloadVelocityMin: 200
}

export type ValidatorConfig = {
  thresholds?: Partial<Thresholds>
  allowlist?: string[]
  ignored?: string[]
  disableSignals?: Partial<Record<SignalName, boolean>>
  offline?: boolean
  strict?: boolean
}
