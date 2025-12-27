import type { ScaffoldConfig } from '../types'
import { exec, logger } from '../utils'

export async function installSeo(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @nuxtjs/seo...')

  const result = await exec('npx nuxi module add @nuxtjs/seo', {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!result.success && !config.dryRun) {
    logger.error('Failed to install @nuxtjs/seo')
    return false
  }

  logger.success('@nuxtjs/seo installed')
  return true
}

export const SEO_CONFIG = {
  module: '@nuxtjs/seo',
}
