import { InstallFlowOptions, runInstallFlow } from './install-flow.js'

export async function runProxyInstall(options: InstallFlowOptions): Promise<number> {
  return await runInstallFlow(options)
}
