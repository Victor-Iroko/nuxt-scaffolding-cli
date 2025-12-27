import type { ScaffoldConfig } from '../types'
import { exec, logger } from '../utils'

export async function installImage(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @nuxt/image...')

  const result = await exec('npx nuxi module add image', {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!result.success && !config.dryRun) {
    logger.error('Failed to install @nuxt/image')
    return false
  }

  logger.success('@nuxt/image installed')
  logger.dim('  → Configure provider in nuxt.config.ts if needed')

  return true
}

export const IMAGE_CONFIG = {
  module: '@nuxt/image',
}
