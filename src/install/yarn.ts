type InstallCommand = {
  command: string
  args: string[]
}

type YarnOptions = {
  pkg: string
  offline: boolean
}

export function buildYarnInstallCommand(options: YarnOptions): InstallCommand {
  const args = ['add', options.pkg]
  if (options.offline) args.push('--offline')
  return { command: 'yarn', args }
}
