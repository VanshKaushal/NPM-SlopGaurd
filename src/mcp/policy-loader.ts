import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'
import { PolicyConfig, DEFAULT_POLICY, mergePolicy } from '../core/policy.js'
import { TrustLevel, TRUST_LEVELS } from '../core/trust-level.js'
import { AllowlistConfig, loadAllowlistConfig } from '../core/allowlist.js'
import { BlocklistConfig, loadBlocklistConfig } from '../core/blocklist.js'
import { PolicyOverride, loadOverridesConfig } from '../core/overrides.js'
import { resolveWorkspacePolicyPaths } from './workspace-policy.js'

const policyFileSchema = z.object({
  mode: z.enum(['permissive', 'balanced', 'strict', 'paranoid']).optional(),
  policy: z.object({
    maxRiskScore: z.number().int().nonnegative().optional(),
    blockHallucinatedPackages: z.boolean().optional(),
    allowInstallScripts: z.enum(['allow', 'warn', 'block']).optional(),
    requireProvenance: z.boolean().optional(),
    maxDependencyDepth: z.number().int().positive().optional(),
    blockNewPackages: z.boolean().optional(),
    minimumConfidence: z.enum(['low', 'medium', 'high']).optional()
  }).partial().optional(),
  allowlist: z.array(z.string()).optional(),
  blocklist: z.array(z.string()).optional(),
  overrides: z.array(z.any()).optional()
}).strict()

export type PolicyBundle = {
  mode: TrustLevel
  policy: PolicyConfig
  allowlist: AllowlistConfig
  blocklist: BlocklistConfig
  overrides: PolicyOverride[]
  sources: {
    preset?: string
    policyFile?: string
    allowlistFile?: string
    blocklistFile?: string
    overridesFile?: string
  }
}

function readJsonFile(filePath: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function resolveConfigDir() {
  const current = fileURLToPath(import.meta.url)
  const candidate = path.resolve(path.dirname(current), '..', '..', 'configs')
  if (fs.existsSync(candidate)) return candidate
  const cwdCandidate = path.resolve(process.cwd(), 'configs')
  if (fs.existsSync(cwdCandidate)) return cwdCandidate
  return candidate
}

function loadPreset(mode: TrustLevel): { policy: PolicyConfig; source?: string } {
  const configDir = resolveConfigDir()
  const presetPath = path.join(configDir, `${mode}.json`)
  const data = readJsonFile(presetPath)
  if (!data) return { policy: { ...DEFAULT_POLICY } }
  return { policy: mergePolicy(data as Partial<PolicyConfig>), source: presetPath }
}

export function loadPolicyBundle(cwd: string): PolicyBundle {
  const policyPaths = resolveWorkspacePolicyPaths(cwd)
  const policyFile = policyPaths.policyPath ? readJsonFile(policyPaths.policyPath) : null
  const parsedPolicyFile = policyFile ? policyFileSchema.safeParse(policyFile) : null

  const mode: TrustLevel = parsedPolicyFile?.success && parsedPolicyFile.data.mode
    ? parsedPolicyFile.data.mode
    : 'balanced'

  const preset = loadPreset(mode)

  const mergedPolicy = mergePolicy({
    ...preset.policy,
    ...(parsedPolicyFile?.success ? parsedPolicyFile.data.policy : undefined)
  })

  const allowlistFromFile = policyPaths.allowlistPath && fs.existsSync(policyPaths.allowlistPath)
    ? loadAllowlistConfig(readJsonFile(policyPaths.allowlistPath))
    : loadAllowlistConfig(undefined)

  const blocklistFromFile = policyPaths.blocklistPath && fs.existsSync(policyPaths.blocklistPath)
    ? loadBlocklistConfig(readJsonFile(policyPaths.blocklistPath))
    : loadBlocklistConfig(undefined)

  const overridesFromFile = policyPaths.overridesPath && fs.existsSync(policyPaths.overridesPath)
    ? loadOverridesConfig(readJsonFile(policyPaths.overridesPath))
    : []

  const allowlistInline = parsedPolicyFile?.success ? loadAllowlistConfig(parsedPolicyFile.data.allowlist) : loadAllowlistConfig(undefined)
  const blocklistInline = parsedPolicyFile?.success ? loadBlocklistConfig(parsedPolicyFile.data.blocklist) : loadBlocklistConfig(undefined)
  const overridesInline = parsedPolicyFile?.success ? loadOverridesConfig(parsedPolicyFile.data.overrides) : []

  const allowlist = { allow: [...allowlistFromFile.allow, ...allowlistInline.allow] }
  const blocklist = { block: [...blocklistFromFile.block, ...blocklistInline.block] }
  const overrides = [...overridesFromFile, ...overridesInline]

  return {
    mode: TRUST_LEVELS.includes(mode) ? mode : 'balanced',
    policy: mergedPolicy,
    allowlist,
    blocklist,
    overrides,
    sources: {
      preset: preset.source,
      policyFile: policyPaths.policyPath,
      allowlistFile: policyPaths.allowlistPath && fs.existsSync(policyPaths.allowlistPath) ? policyPaths.allowlistPath : undefined,
      blocklistFile: policyPaths.blocklistPath && fs.existsSync(policyPaths.blocklistPath) ? policyPaths.blocklistPath : undefined,
      overridesFile: policyPaths.overridesPath && fs.existsSync(policyPaths.overridesPath) ? policyPaths.overridesPath : undefined
    }
  }
}
