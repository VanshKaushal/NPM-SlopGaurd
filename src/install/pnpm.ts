type InstallCommand = {
  command: string
  args: string[]
}

type PnpmOptions = {
  pkg: string
  offline: boolean
}

export function buildPnpmInstallCommand(options: PnpmOptions): InstallCommand {
  const args = ['add', options.pkg]
  if (options.offline) args.push('--offline')
  return { command: 'pnpm', args }
}
