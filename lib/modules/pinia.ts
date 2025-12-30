import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, readFile, logger } from '../utils'

export const PINIA_PACKAGES = {
  deps: ['pinia-plugin-persistedstate'],
}

export async function setupPinia(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up @pinia/nuxt...')

  if (!config.dryRun) {
    const configPath = join(config.projectPath, 'nuxt.config.ts')
    let existingConfig = readFile(configPath)

    if (existingConfig && !existingConfig.includes('pinia-plugin-persistedstate/nuxt')) {
      const moduleEntry = "'pinia-plugin-persistedstate/nuxt'"

      if (existingConfig.includes('modules: [')) {
        // Add to existing modules array - insert after @pinia/nuxt if present, otherwise at end
        if (existingConfig.includes('@pinia/nuxt')) {
          existingConfig = existingConfig.replace(
            /(['"]@pinia\/nuxt['"])/,
            `$1,\n    ${moduleEntry}`
          )
        } else {
          // Add at end of modules array
          existingConfig = existingConfig.replace(
            /(modules:\s*\[[\s\S]*?)(\s*\])/,
            `$1,\n    ${moduleEntry}$2`
          )
        }
      }

      writeFile(configPath, existingConfig, { dryRun: config.dryRun })
    }
  }

  logger.success('@pinia/nuxt + pinia-plugin-persistedstate configured')
  return true
}

export const PINIA_CONFIG = {
  modules: ['@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],
}
