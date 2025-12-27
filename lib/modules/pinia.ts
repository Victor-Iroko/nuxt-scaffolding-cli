import type { ScaffoldConfig } from '../types'
import { exec, bunInstall, logger } from '../utils'

export async function installPinia(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @pinia/nuxt and pinia-plugin-persistedstate...')

  const result = await exec('npx nuxi module add pinia', {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!result.success && !config.dryRun) {
    logger.error('Failed to install @pinia/nuxt')
    return false
  }

  const persistedInstalled = await bunInstall(['pinia-plugin-persistedstate'], {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!persistedInstalled && !config.dryRun) {
    logger.error('Failed to install pinia-plugin-persistedstate')
    return false
  }

  logger.success('@pinia/nuxt + pinia-plugin-persistedstate installed')
  logger.dim('  → Add to nuxt.config.ts modules: "@pinia/nuxt", "pinia-plugin-persistedstate/nuxt"')

  return true
}

export const PINIA_CONFIG = {
  modules: ['@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],
}
