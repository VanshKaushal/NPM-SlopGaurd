import { PolicyConfig } from '../core/policy.js'
import { TrustLevel } from '../core/trust-level.js'

export type InstallPolicyReport = {
  mode: TrustLevel
  policy: PolicyConfig
  sources: {
    preset?: string
    policyFile?: string
    allowlistFile?: string
    blocklistFile?: string
    overridesFile?: string
  }
}
