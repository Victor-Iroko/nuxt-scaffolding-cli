import type { ScaffoldConfig, NuxtModule } from '../types'
import { exec, readJsonFile, logger } from '../utils'

// Official module setup functions (installed by Nuxt CLI, configured by us)
import { setupNuxtUI, NUXT_UI_CONFIG } from './nuxt-ui'
import { setupEslint, ESLINT_CONFIG } from './eslint'
import { setupTestUtils, TEST_UTILS_CONFIG } from './test-utils'

// Non-official module setup functions
import { setupPinia, PINIA_PACKAGES } from './pinia'
import { MOTION_PACKAGES } from './motion'
import { SECURITY_CONFIG } from './security'
import { MDC_PACKAGES } from './mdc'

export {
  setupNuxtUI,
  setupEslint,
  setupTestUtils,
  setupPinia,
  NUXT_UI_CONFIG,
  ESLINT_CONFIG,
  TEST_UTILS_CONFIG,
}

// Non-official modules that need `nuxt module add` after project init
const NON_OFFICIAL_MODULE_MAP: Partial<Record<NuxtModule, string>> = {
  pinia: 'pinia',
  vueuse: 'vueuse',
  motion: '@vueuse/motion',
  seo: '@nuxtjs/seo',
  security: 'security',
  mdc: '@nuxtjs/mdc',
}

export function getNonOfficialModules(config: ScaffoldConfig): string[] {
  const modules: string[] = []

  for (const mod of config.modules) {
    const moduleName = NON_OFFICIAL_MODULE_MAP[mod]
    if (moduleName) {
      modules.push(moduleName)
    }
  }

  return modules
}

export interface ModulePackages {
  deps: string[]
  devDeps: string[]
}

export function collectModulePackages(config: ScaffoldConfig): ModulePackages {
  const deps: string[] = []
  const devDeps: string[] = []

  // Only collect packages for modules NOT handled by --modules flag at init
  // Official modules are installed via `bun create nuxt@latest --modules`

  // Pinia needs extra package (pinia-plugin-persistedstate)
  if (config.modules.includes('pinia')) {
    deps.push(...PINIA_PACKAGES.deps)
  }

  // Motion needs the package
  if (config.modules.includes('motion')) {
    deps.push(...MOTION_PACKAGES.deps)
  }

  // MDC needs the package
  if (config.modules.includes('mdc')) {
    deps.push(...MDC_PACKAGES.deps)
  }

  return { deps, devDeps }
}

async function runNuxtModuleAdd(modules: string[], config: ScaffoldConfig): Promise<boolean> {
  let allSuccess = true

  for (const mod of modules) {
    logger.step(`Adding ${mod} module via nuxt module add...`)
    const result = await exec(`bunx nuxt module add ${mod}`, {
      cwd: config.projectPath,
      dryRun: config.dryRun,
    })
    if (!result.success && !config.dryRun) {
      logger.error(`Failed to add ${mod} module`)
      allSuccess = false
    }
  }

  return allSuccess
}

export async function setupModules(config: ScaffoldConfig): Promise<boolean> {
  logger.title('Setting up Nuxt Modules')

  // Non-official modules need `nuxt module add` after init
  const nonOfficialModules = getNonOfficialModules(config)

  if (nonOfficialModules.length > 0) {
    const success = await runNuxtModuleAdd(nonOfficialModules, config)
    if (!success) {
      logger.warn('Some module additions failed')
    }
  }

  // Run setup functions for modules that need additional file creation
  if (config.modules.includes('pinia')) {
    await setupPinia(config)
  }

  logger.success('All modules configured')
  return true
}

// Keep for backward compatibility
export async function installModules(config: ScaffoldConfig): Promise<boolean> {
  return setupModules(config)
}

export function getModuleConfigs(config: ScaffoldConfig): {
  css: string[]
  securityOptions?: Record<string, unknown>
} {
  const css: string[] = []
  let securityOptions: Record<string, unknown> | undefined

  // Modules are already added to nuxt.config.ts by `nuxt module add` in setupModules()
  // and by setupPinia() for pinia-plugin-persistedstate
  // Here we only return additional config that nuxt module add doesn't handle

  if (config.modules.includes('security')) {
    securityOptions = SECURITY_CONFIG.options
  }

  return { css, securityOptions }
}

// Setup official modules that were installed by Nuxt CLI
// Reads package.json to detect which official modules are installed
export async function setupOfficialModules(config: ScaffoldConfig): Promise<boolean> {
  logger.title('Configuring Official Modules')

  const packageJsonPath = `${config.projectPath}/package.json`
  const packageJson = readJsonFile(packageJsonPath) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  } | null

  if (!packageJson) {
    logger.warn('Could not read package.json')
    return false
  }

  const deps: Record<string, string> = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  }

  // Configure @nuxt/ui if installed
  if (deps['@nuxt/ui']) {
    await setupNuxtUI(config)
  }

  // Configure @nuxt/eslint if installed
  if (deps['@nuxt/eslint']) {
    await setupEslint(config)
  }

  // Configure @nuxt/test-utils if installed
  if (deps['@nuxt/test-utils']) {
    await setupTestUtils(config)
  }

  logger.success('Official modules configured')
  return true
}
