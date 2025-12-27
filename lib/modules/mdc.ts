import type { ScaffoldConfig } from '../types'
import { bunInstall, logger } from '../utils'

export async function installMdc(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @nuxtjs/mdc...')

  const installed = await bunInstall(['@nuxtjs/mdc'], {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!installed && !config.dryRun) {
    logger.error('Failed to install @nuxtjs/mdc')
    return false
  }

  logger.success('@nuxtjs/mdc installed')
  logger.dim('  → Add to nuxt.config.ts modules: "@nuxtjs/mdc"')

  return true
}

export const MDC_CONFIG = {
  module: '@nuxtjs/mdc',
}
