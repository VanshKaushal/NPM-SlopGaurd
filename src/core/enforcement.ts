import { PolicyDecision } from './decision.js'

export type EnforcementContext = {
  ignoreWarnings: boolean
  nonInteractive: boolean
  dryRun: boolean
}

export type EnforcementOutcome = {
  shouldInstall: boolean
  exitCode: number
}

export function resolveEnforcement(decision: PolicyDecision, context: EnforcementContext): EnforcementOutcome {
  if (decision.action === 'block') return { shouldInstall: false, exitCode: 1 }

  if (decision.action === 'warn') {
    if (context.nonInteractive && !context.ignoreWarnings) {
      return { shouldInstall: false, exitCode: 2 }
    }
    if (context.dryRun) return { shouldInstall: false, exitCode: 0 }
    return { shouldInstall: true, exitCode: context.ignoreWarnings ? 0 : 2 }
  }

  if (context.dryRun) return { shouldInstall: false, exitCode: 0 }
  return { shouldInstall: true, exitCode: 0 }
}
