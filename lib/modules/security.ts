import type { ScaffoldConfig } from '../types'
import { exec, logger } from '../utils'

export async function installSecurity(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing nuxt-security...')

  const result = await exec('npx nuxi module add security', {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!result.success && !config.dryRun) {
    logger.error('Failed to install nuxt-security')
    return false
  }

  logger.success('nuxt-security installed')
  logger.dim('  → Enable CSRF in nuxt.config.ts: security: { csrf: true }')

  return true
}

export const SECURITY_CONFIG = {
  module: 'nuxt-security',
  options: {
    csrf: true,
  },
}
