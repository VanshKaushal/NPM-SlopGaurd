export type TrustLevel =
  | 'permissive'
  | 'balanced'
  | 'strict'
  | 'paranoid'
  | 'enterprise-policy'
  | 'fintech-policy'
  | 'ai-agent-policy'
  | 'ci-lockdown-policy'

export const TRUST_LEVELS: TrustLevel[] = [
  'permissive',
  'balanced',
  'strict',
  'paranoid',
  'enterprise-policy',
  'fintech-policy',
  'ai-agent-policy',
  'ci-lockdown-policy'
]
