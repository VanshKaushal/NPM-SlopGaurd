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
    allowSubstringMatching: partial.allowSubstringMatching ?? DEFAULT_POLICY.allowSubstringMatching
  }
}
