type InstallCommand = {
  command: string
  args: string[]
}

type NpmOptions = {
  pkg: string
  offline: boolean
}

export function buildNpmInstallCommand(options: NpmOptions): InstallCommand {
  const args = ['install', options.pkg]
  if (options.offline) args.push('--offline')
  return { command: 'npm', args }
}
