import type { ScaffoldConfig } from '../types'
import { bunInstall, logger } from '../utils'

export async function installMotion(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @vueuse/motion...')

  const installed = await bunInstall(['@vueuse/motion'], {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!installed && !config.dryRun) {
    logger.error('Failed to install @vueuse/motion')
    return false
  }

  logger.success('@vueuse/motion installed')
  logger.dim('  → Add to nuxt.config.ts modules: "@vueuse/motion/nuxt"')

  return true
}

export const MOTION_CONFIG = {
  module: '@vueuse/motion/nuxt',
}
