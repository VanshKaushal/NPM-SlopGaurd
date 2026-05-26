import path from 'path'
import { pathToFileURL } from 'url'
import { z } from 'zod'
import { DEFAULT_THRESHOLDS, SignalName, ValidatorConfig } from '../types.js'

const configSchema = z.object({
  thresholds: z.object({
    publisherAgeDays: z.number().int().positive().optional(),
    versionAgeHours: z.number().int().positive().optional(),
    downloadVelocityMin: z.number().int().nonnegative().optional()
  }).optional(),
  allowlist: z.array(z.string()).optional(),
  ignored: z.array(z.string()).optional(),
  disableSignals: z.record(z.string(), z.boolean()).optional(),
  offline: z.boolean().optional(),
  strict: z.boolean().optional()
}).strict()

export const DEFAULT_CONFIG: ValidatorConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  allowlist: [],
  ignored: [],
  disableSignals: {},
  offline: false,
  strict: false
}

export async function loadConfig(cwd = process.cwd()): Promise<ValidatorConfig> {
  const configPath = path.resolve(cwd, 'slopguard.config.js')
  try {
    const mod = await import(pathToFileURL(configPath).href)
    const parsed = configSchema.safeParse(mod.default ?? mod)
    if (!parsed.success) return DEFAULT_CONFIG
    return mergeConfig(parsed.data)
  } catch (err) {
    return DEFAULT_CONFIG
  }
}

export function mergeConfig(partial: ValidatorConfig): ValidatorConfig {
  return {
    thresholds: { ...DEFAULT_THRESHOLDS, ...(partial.thresholds ?? {}) },
    allowlist: partial.allowlist ?? [],
    ignored: partial.ignored ?? [],
    disableSignals: partial.disableSignals ?? {},
    offline: partial.offline ?? false,
    strict: partial.strict ?? false
  }
}

export function isSignalDisabled(disabled: ValidatorConfig['disableSignals'], name: SignalName) {
  return Boolean(disabled && disabled[name])
}
