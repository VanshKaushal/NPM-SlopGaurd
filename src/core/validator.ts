import { checkPackageExists, getPackageMetadata, getUserInfo } from './registry.js'
import { getDownloadsLastWeek } from './downloads.js'
import { getAttestation } from './provenance.js'
import { isHotlisted } from './hotlist.js'
import { loadConfig, isSignalDisabled, mergeConfig } from './config.js'
import { scoreSignals } from './scoring.js'
import {
  DEFAULT_THRESHOLDS,
  SignalName,
  SignalResult,
  ValidationResult,
  ValidatorConfig
} from '../types.js'

type PackageSpec = { name: string; version?: string }

function parsePackageSpec(input: string): PackageSpec {
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

function isSemverRange(version?: string) {
  if (!version) return false
  return /[~^><=*|\s]/.test(version)
}

function resolveVersion(meta: any, requested?: string) {
  const distTags = meta?.distTags ?? {}
  if (!requested) return { version: distTags.latest, resolvedFrom: 'latest' }
  if (distTags[requested]) return { version: distTags[requested], resolvedFrom: `tag:${requested}` }
  if (isSemverRange(requested)) return { version: distTags.latest, resolvedFrom: 'range-latest' }
  return { version: requested, resolvedFrom: 'exact' }
}

function ageInHours(iso?: string) {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return (Date.now() - t) / (1000 * 60 * 60)
}

function makeSignal(
  name: SignalName,
  passed: boolean,
  message?: string,
  hardFail = false
): SignalResult {
  return { name, passed, message, hardFail }
}

export async function validatePackage(
  input: string,
  config?: ValidatorConfig
): Promise<ValidationResult> {
  const loaded = config ? mergeConfig(config) : await loadConfig()
  const spec = parsePackageSpec(input)
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(loaded.thresholds ?? {}) }
  const raw: Record<string, SignalResult> = {}
  const warnings: SignalResult[] = []
  const infos: SignalResult[] = []

  if (loaded.allowlist?.includes(spec.name)) {
    return {
      pkg: spec.name,
      version: spec.version,
      hardBlocked: false,
      warnings: [],
      infos: [{ name: 'existence', hardFail: true, passed: true, message: 'allowlisted' }],
      score: 100,
      raw: {}
    }
  }

  if (loaded.ignored?.includes(spec.name)) {
    return {
      pkg: spec.name,
      version: spec.version,
      hardBlocked: false,
      warnings: [],
      infos: [{ name: 'existence', hardFail: true, passed: true, message: 'ignored' }],
      score: 100,
      raw: {}
    }
  }

  let circuitOpenPenalty = 0;

  // Signal 1 — registry existence (hard fail only on 404)
  if (!loaded.offline && !isSignalDisabled(loaded.disableSignals, 'existence')) {
    const r = await checkPackageExists(spec.name)
    if (r.degraded === 'circuit_open') {
      const info = makeSignal('existence', false, 'warn', false)
      raw.existence = info
      warnings.push(info)
      console.warn("Registry unreachable — degraded mode active, score penalized")
      circuitOpenPenalty = r.score_penalty || 40
    } else if (r.exists === false) {
      raw.existence = makeSignal('existence', false, `status=${r.status}`, true)
      return {
        pkg: spec.name,
        version: spec.version,
        hardBlocked: true,
        warnings: [],
        infos: [],
        score: 0,
        raw
      }
    } else if (r.exists === null) {
      const info = makeSignal('existence', true, 'unknown', true)
      raw.existence = info
      infos.push(info)
    } else {
      raw.existence = makeSignal('existence', true, 'ok', true)
    }
  } else {
    const info = makeSignal('existence', true, 'offline-skip', true)
    raw.existence = info
    infos.push(info)
  }

  // Signal 5 — hotlist hard block (local-only)
  if (!isSignalDisabled(loaded.disableSignals, 'hotlist')) {
    const hot = isHotlisted(spec.name)
    raw.hotlist = makeSignal('hotlist', !hot, hot ? 'match' : 'no-match', true)
    if (hot) {
      return {
        pkg: spec.name,
        version: spec.version,
        hardBlocked: true,
        warnings: [],
        infos: [],
        score: 0,
        raw
      }
    }
  }

  let meta: any | null = null
  if (!loaded.offline) {
    meta = await getPackageMetadata(spec.name)
  }

  const resolved = resolveVersion(meta, spec.version)
  const resolvedVersion = resolved.version

  const signalPromises: Array<Promise<void>> = []

  // Signal 2 — publisher account age
  if (!loaded.offline && !isSignalDisabled(loaded.disableSignals, 'publisher_age')) {
    signalPromises.push((async () => {
      let created: string | undefined
      const publisher = meta?.versions?.[resolvedVersion]?.publisher?.name
      const maintainers = meta?.maintainers?.map((m: any) => m.name) ?? []
      const candidates = [publisher, ...maintainers].filter(Boolean) as string[]
      for (const name of candidates) {
        const info = await getUserInfo(name)
        if (info?.created) {
          created = info.created
          break
        }
      }
      const ageHours = ageInHours(created)
      if (ageHours === null) {
        const info = makeSignal('publisher_age', true, 'unknown')
        raw.publisher_age = info
        infos.push(info)
        return
      }
      const minHours = thresholds.publisherAgeDays * 24
      const passed = ageHours >= minHours
      const sig = makeSignal('publisher_age', passed, `age_hours=${Math.round(ageHours)}`)
      raw.publisher_age = sig
      if (!passed) warnings.push(sig)
    })())
  } else if (loaded.offline && !isSignalDisabled(loaded.disableSignals, 'publisher_age')) {
    const info = makeSignal('publisher_age', false, 'offline-unknown')
    info.offlineUnknown = true
    raw.publisher_age = info
    infos.push(info)
  }

  // Signal 3 — version age
  if (!loaded.offline && !isSignalDisabled(loaded.disableSignals, 'version_age')) {
    signalPromises.push((async () => {
      const time = meta?.time?.[resolvedVersion]
      const ageHours = ageInHours(time)
      if (ageHours === null) {
        const info = makeSignal('version_age', true, 'unknown')
        raw.version_age = info
        infos.push(info)
        return
      }
      const minHours = thresholds.versionAgeHours
      const passed = ageHours >= minHours
      const sig = makeSignal('version_age', passed, `age_hours=${Math.round(ageHours)} (${resolved.resolvedFrom})`)
      raw.version_age = sig
      if (!passed) warnings.push(sig)
    })())
  } else if (loaded.offline && !isSignalDisabled(loaded.disableSignals, 'version_age')) {
    const info = makeSignal('version_age', false, 'offline-unknown')
    info.offlineUnknown = true
    raw.version_age = info
    infos.push(info)
  }

  // Signal 4 — download velocity
  if (!loaded.offline && !isSignalDisabled(loaded.disableSignals, 'download_velocity')) {
    signalPromises.push((async () => {
      const r = await getDownloadsLastWeek(spec.name)
      if (r.downloads === null) {
        const info = makeSignal('download_velocity', true, 'unknown')
        raw.download_velocity = info
        infos.push(info)
        return
      }
      const min = thresholds.downloadVelocityMin
      const passed = r.downloads >= min
      const sig = makeSignal('download_velocity', passed, `downloads_last_week=${r.downloads}`)
      raw.download_velocity = sig
      if (!passed) warnings.push(sig)
    })())
  } else if (loaded.offline && !isSignalDisabled(loaded.disableSignals, 'download_velocity')) {
    const info = makeSignal('download_velocity', false, 'offline-unknown')
    info.offlineUnknown = true
    raw.download_velocity = info
    infos.push(info)
  }

  // Signal 6 — provenance attestation
  if (!loaded.offline && !isSignalDisabled(loaded.disableSignals, 'provenance') && resolvedVersion) {
    signalPromises.push((async () => {
      const r = await getAttestation(spec.name, resolvedVersion)
      if (r.hasAttestation === null) {
        const info = makeSignal('provenance', true, 'unknown')
        raw.provenance = info
        infos.push(info)
        return
      }
      const passed = r.hasAttestation
      const sig = makeSignal('provenance', passed, passed ? 'attested' : 'missing')
      raw.provenance = sig
      if (!passed) warnings.push(sig)
    })())
  } else if (loaded.offline && !isSignalDisabled(loaded.disableSignals, 'provenance')) {
    const info = makeSignal('provenance', false, 'offline-unknown')
    info.offlineUnknown = true
    raw.provenance = info
    infos.push(info)
  }

  await Promise.all(signalPromises)

  let score = scoreSignals(raw)
  score -= circuitOpenPenalty
  if (circuitOpenPenalty > 0 && score > 55) {
    score = 55
  }
  if (score < 0) score = 0

  return {
    pkg: spec.name,
    version: resolvedVersion ?? spec.version,
    hardBlocked: false,
    warnings,
    infos,
    score,
    raw
  }
}
