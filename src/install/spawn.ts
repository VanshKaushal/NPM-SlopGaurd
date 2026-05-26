import { spawn } from 'child_process'

type SpawnOptions = {
  cwd?: string
}

export async function spawnCommand(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<number> {
  return await new Promise(resolve => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      cwd: options.cwd ?? process.cwd()
    })

    child.on('error', err => {
      console.error(err)
      resolve(1)
    })

    child.on('close', code => {
      resolve(code ?? 1)
    })
  })
}
