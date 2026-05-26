export type AgentContext = {
  isCi: boolean
  isAgent: boolean
  nonInteractive: boolean
  source: 'ci' | 'agent' | 'user'
}

export function getAgentContext(env: NodeJS.ProcessEnv = process.env): AgentContext {
  const isCi = Boolean(env.CI) || Boolean(env.GITHUB_ACTIONS) || Boolean(env.BUILD_NUMBER)
  const isAgent = Boolean(env.SLOPGUARD_AGENT) || Boolean(env.MCP) || Boolean(env.COPILOT_AGENT)
  const nonInteractive = isCi || isAgent || env.SLOPGUARD_NON_INTERACTIVE === '1'

  const source: AgentContext['source'] = isCi ? 'ci' : isAgent ? 'agent' : 'user'

  return {
    isCi,
    isAgent,
    nonInteractive,
    source
  }
}
