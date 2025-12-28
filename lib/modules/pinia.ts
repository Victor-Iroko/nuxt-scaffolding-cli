import type { ScaffoldConfig } from '../types'
import { logger } from '../utils'

export const PINIA_PACKAGES = {
  deps: ['pinia-plugin-persistedstate'],
}

export async function setupPinia(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up @pinia/nuxt...')
  // Pinia is added via nuxi module add, persistedstate is in batch install
  // No additional file setup needed
  logger.success('@pinia/nuxt + pinia-plugin-persistedstate configured')
  return true
}

export const PINIA_CONFIG = {
  modules: ['@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],
}
