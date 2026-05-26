import { PolicyConfig } from '../core/policy.js'
import { TrustLevel } from '../core/trust-level.js'

export type TrustPolicy = {
  mode: TrustLevel
  policy: PolicyConfig
}
