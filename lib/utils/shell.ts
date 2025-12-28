import { $ } from 'bun'
import { logger } from './logger'

export interface ShellOptions {
  cwd?: string
  dryRun?: boolean
  silent?: boolean
}

export async function exec(
  command: string,
  options: ShellOptions = {}
): Promise<{ success: boolean; output: string }> {
  const { cwd, dryRun = false, silent = false } = options

  if (dryRun) {
    logger.command(command)
    return { success: true, output: '' }
  }

  if (!silent) {
    logger.command(command)
  }

  try {
    const result = await $`${{ raw: command }}`.cwd(cwd ?? process.cwd()).quiet()
    return { success: true, output: result.text() }
  } catch (error) {
    const err = error as Error
    return { success: false, output: err.message }
  }
}

export async function execWithOutput(
  command: string,
  options: ShellOptions = {}
): Promise<{ success: boolean; output: string }> {
  const { cwd, dryRun = false } = options

  if (dryRun) {
    logger.command(command)
    return { success: true, output: '' }
  }

  logger.command(command)

  try {
    const result = await $`${{ raw: command }}`.cwd(cwd ?? process.cwd())
    return { success: true, output: result.text() }
  } catch (error) {
    const err = error as Error
    return { success: false, output: err.message }
  }
}

export async function bunInstall(
  packages: string[],
  options: ShellOptions & { dev?: boolean } = {}
): Promise<boolean> {
  const { dev = false, ...shellOptions } = options
  const devFlag = dev ? '-d' : ''
  const command = `bun add ${devFlag} ${packages.join(' ')}`.trim()
  const result = await exec(command, shellOptions)
  return result.success
}

export async function bunInstallWithProgress(
  packages: string[],
  options: ShellOptions & { dev?: boolean } = {}
): Promise<boolean> {
  const { dev = false, cwd, dryRun = false } = options
  const devFlag = dev ? '-d' : ''
  const command = `bun add ${devFlag} ${packages.join(' ')}`.trim()

  if (dryRun) {
    logger.command(command)
    return true
  }

  logger.command(command)

  try {
    await $`${{ raw: command }}`.cwd(cwd ?? process.cwd())
    return true
  } catch (error) {
    const err = error as Error
    logger.error(err.message)
    return false
  }
}

export async function bunRun(
  script: string,
  options: ShellOptions = {}
): Promise<boolean> {
  const command = `bun run ${script}`
  const result = await exec(command, options)
  return result.success
}

export async function bunxCommand(
  command: string,
  options: ShellOptions = {}
): Promise<boolean> {
  const result = await exec(`bunx ${command}`, options)
  return result.success
}
