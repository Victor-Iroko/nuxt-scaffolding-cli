import type { ScaffoldConfig } from '../types'
import { exec, logger } from '../utils'

export async function installVueuse(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @vueuse/nuxt...')

  const result = await exec('npx nuxi module add vueuse', {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!result.success && !config.dryRun) {
    logger.error('Failed to install @vueuse/nuxt')
    return false
  }

  logger.success('@vueuse/nuxt installed')
  return true
}

export const VUEUSE_CONFIG = {
  module: '@vueuse/nuxt',
}
