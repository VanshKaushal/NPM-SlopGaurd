import { ConfidenceLevel } from './confidence.js'
import { TrustLevel } from './trust-level.js'

export type InstallScriptPolicy = 'allow' | 'warn' | 'block'

export type PolicyConfig = {
  maxRiskScore: number
  blockHallucinatedPackages: boolean
  allowInstallScripts: InstallScriptPolicy
  requireProvenance: boolean
  maxDependencyDepth: number
  blockNewPackages: boolean
  minimumConfidence: ConfidenceLevel
  allowSubstringMatching: boolean
  // Extended policy fields for enterprise/fintech/ai/ci packs
  allowMutableGitRefs?: boolean
  requireLockfile?: boolean
  allowedRegistries?: string[]
  blockOnCircuitOpen?: boolean
  minPublisherAgeDays?: number
  minVersionAgeDays?: number
  blockUnverifiedIntegrity?: boolean
  requireSBOM?: boolean
  auditLogPath?: string
  allowedScopes?: string[]
  offlineMode?: boolean
  frozenLockfile?: boolean
}

export type PolicyPreset = {
  mode: TrustLevel
  policy: PolicyConfig
}

export const DEFAULT_POLICY: PolicyConfig = {
  maxRiskScore: 40,
  blockHallucinatedPackages: true,
  allowInstallScripts: 'warn',
  requireProvenance: false,
  maxDependencyDepth: 25,
  blockNewPackages: false,
  minimumConfidence: 'medium',
  allowSubstringMatching: false
}

export function mergePolicy(partial?: Partial<PolicyConfig>): PolicyConfig {
  if (!partial) return { ...DEFAULT_POLICY }
  return {
    maxRiskScore: partial.maxRiskScore ?? DEFAULT_POLICY.maxRiskScore,
    blockHallucinatedPackages: partial.blockHallucinatedPackages ?? DEFAULT_POLICY.blockHallucinatedPackages,
    allowInstallScripts: partial.allowInstallScripts ?? DEFAULT_POLICY.allowInstallScripts,
    requireProvenance: partial.requireProvenance ?? DEFAULT_POLICY.requireProvenance,
    maxDependencyDepth: partial.maxDependencyDepth ?? DEFAULT_POLICY.maxDependencyDepth,
    blockNewPackages: partial.blockNewPackages ?? DEFAULT_POLICY.blockNewPackages,
    minimumConfidence: partial.minimumConfidence ?? DEFAULT_POLICY.minimumConfidence,
    allowSubstringMatching: partial.allowSubstringMatching ?? DEFAULT_POLICY.allowSubstringMatching,
    ...(partial.allowMutableGitRefs !== undefined && { allowMutableGitRefs: partial.allowMutableGitRefs }),
    ...(partial.requireLockfile !== undefined && { requireLockfile: partial.requireLockfile }),
    ...(partial.allowedRegistries !== undefined && { allowedRegistries: partial.allowedRegistries }),
    ...(partial.blockOnCircuitOpen !== undefined && { blockOnCircuitOpen: partial.blockOnCircuitOpen }),
    ...(partial.minPublisherAgeDays !== undefined && { minPublisherAgeDays: partial.minPublisherAgeDays }),
    ...(partial.minVersionAgeDays !== undefined && { minVersionAgeDays: partial.minVersionAgeDays }),
    ...(partial.blockUnverifiedIntegrity !== undefined && { blockUnverifiedIntegrity: partial.blockUnverifiedIntegrity }),
    ...(partial.requireSBOM !== undefined && { requireSBOM: partial.requireSBOM }),
    ...(partial.auditLogPath !== undefined && { auditLogPath: partial.auditLogPath }),
    ...(partial.allowedScopes !== undefined && { allowedScopes: partial.allowedScopes }),
    ...(partial.offlineMode !== undefined && { offlineMode: partial.offlineMode }),
    ...(partial.frozenLockfile !== undefined && { frozenLockfile: partial.frozenLockfile })
  }
}
