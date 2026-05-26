import semver from 'semver'

export function isSemverRange(value?: string) {
  if (!value) return false
  return Boolean(semver.validRange(value))
}

export function isExactVersion(value?: string) {
  if (!value) return false
  return Boolean(semver.valid(value))
}

export function pickMaxSatisfying(versions: string[], range?: string) {
  if (!range) return null
  return semver.maxSatisfying(versions, range) ?? null
}

export function normalizeRange(range?: string) {
  if (!range) return null
  const valid = semver.validRange(range)
  return valid ?? null
}
