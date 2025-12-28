import type { ScaffoldConfig } from '../types'
import { exec, logger } from '../utils'

import { setupNuxtUI, NUXT_UI_PACKAGES, NUXT_UI_CONFIG } from './nuxt-ui'
import { setupEslint, ESLINT_CONFIG } from './eslint'
import { setupTestUtils, TEST_UTILS_PACKAGES, TEST_UTILS_CONFIG } from './test-utils'
import { setupContent, CONTENT_PACKAGES, CONTENT_CONFIG } from './content'
import { setupPinia, PINIA_PACKAGES, PINIA_CONFIG } from './pinia'
import { VUEUSE_CONFIG } from './vueuse'
import { MOTION_PACKAGES, MOTION_CONFIG } from './motion'
import { SEO_CONFIG } from './seo'
import { SECURITY_CONFIG } from './security'
import { IMAGE_CONFIG } from './image'
import { MDC_PACKAGES, MDC_CONFIG } from './mdc'
import { ICON_CONFIG } from './icon'
import { FONTS_CONFIG } from './fonts'
import { SCRIPTS_CONFIG } from './scripts'
import { DEVTOOLS_CONFIG } from './devtools'
import { HINTS_CONFIG } from './hints'

export {
  setupNuxtUI as installNuxtUI,
  setupEslint as installEslint,
  setupTestUtils as installTestUtils,
  setupContent as installContent,
  setupPinia as installPinia,
  NUXT_UI_CONFIG,
  ESLINT_CONFIG,
  TEST_UTILS_CONFIG,
  CONTENT_CONFIG,
  PINIA_CONFIG,
  VUEUSE_CONFIG,
  MOTION_CONFIG,
  SEO_CONFIG,
  SECURITY_CONFIG,
  IMAGE_CONFIG,
  MDC_CONFIG,
  ICON_CONFIG,
  FONTS_CONFIG,
  SCRIPTS_CONFIG,
  DEVTOOLS_CONFIG,
  HINTS_CONFIG,
}

export interface ModulePackages {
  deps: string[]
  devDeps: string[]
}

export function collectModulePackages(config: ScaffoldConfig): ModulePackages {
  const deps: string[] = []
  const devDeps: string[] = []

  // Collect packages from selected modules
  if (config.modules.includes('nuxt-ui')) {
    deps.push(...NUXT_UI_PACKAGES.deps)
  }

  if (config.modules.includes('test-utils')) {
    devDeps.push(...TEST_UTILS_PACKAGES.devDeps)
  }

  if (config.modules.includes('pinia')) {
    deps.push(...PINIA_PACKAGES.deps)
  }

  if (config.modules.includes('motion')) {
    deps.push(...MOTION_PACKAGES.deps)
  }

  if (config.modules.includes('mdc')) {
    deps.push(...MDC_PACKAGES.deps)
  }

  // Collect packages from optional modules
  if (config.optionalModules.includes('content')) {
    deps.push(...CONTENT_PACKAGES.deps)
  }

  return { deps, devDeps }
}

async function runNuxiModuleAdd(modules: string[], config: ScaffoldConfig): Promise<boolean> {
  let allSuccess = true

  for (const mod of modules) {
    logger.step(`Adding ${mod} module via nuxi...`)
    const result = await exec(`bunx nuxi module add ${mod}`, {
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

  // Run nuxi module add for modules that need it
  const nuxiModules: string[] = []
  if (config.modules.includes('eslint')) nuxiModules.push('eslint')
  if (config.modules.includes('pinia')) nuxiModules.push('pinia')
  if (config.modules.includes('vueuse')) nuxiModules.push('vueuse')
  if (config.modules.includes('seo')) nuxiModules.push('@nuxtjs/seo')
  if (config.modules.includes('security')) nuxiModules.push('security')
  if (config.modules.includes('icon')) nuxiModules.push('icon')
  if (config.modules.includes('fonts')) nuxiModules.push('fonts')
  if (config.modules.includes('scripts')) nuxiModules.push('scripts')
  if (config.modules.includes('devtools')) nuxiModules.push('devtools')
  if (config.modules.includes('hints')) nuxiModules.push('hints')
  if (config.optionalModules.includes('image')) nuxiModules.push('image')

  if (nuxiModules.length > 0) {
    const nuxiSuccess = await runNuxiModuleAdd(nuxiModules, config)
    if (!nuxiSuccess) {
      logger.warn('Some nuxi module additions failed')
    }
  }

  // Run setup functions for modules that need file creation
  if (config.modules.includes('nuxt-ui')) {
    await setupNuxtUI(config)
  }

  if (config.modules.includes('eslint')) {
    await setupEslint(config)
  }

  if (config.modules.includes('test-utils')) {
    await setupTestUtils(config)
  }

  if (config.modules.includes('pinia')) {
    await setupPinia(config)
  }

  if (config.optionalModules.includes('content')) {
    await setupContent(config)
  }

  logger.success('All modules configured')
  return true
}

// Keep for backward compatibility
export async function installModules(config: ScaffoldConfig): Promise<boolean> {
  return setupModules(config)
}

export function getModuleConfigs(config: ScaffoldConfig): {
  modules: string[]
  css: string[]
  securityOptions?: Record<string, unknown>
} {
  const modules: string[] = []
  const css: string[] = []
  let securityOptions: Record<string, unknown> | undefined

  if (config.modules.includes('nuxt-ui')) {
    modules.push(NUXT_UI_CONFIG.module)
    css.push(NUXT_UI_CONFIG.css)
  }

  if (config.modules.includes('eslint')) {
    modules.push(ESLINT_CONFIG.module)
  }

  if (config.modules.includes('test-utils')) {
    modules.push(TEST_UTILS_CONFIG.module)
  }

  if (config.modules.includes('pinia')) {
    modules.push(...PINIA_CONFIG.modules)
  }

  if (config.modules.includes('vueuse')) {
    modules.push(VUEUSE_CONFIG.module)
  }

  if (config.modules.includes('motion')) {
    modules.push(MOTION_CONFIG.module)
  }

  if (config.modules.includes('seo')) {
    modules.push(SEO_CONFIG.module)
  }

  if (config.modules.includes('security')) {
    modules.push(SECURITY_CONFIG.module)
    securityOptions = SECURITY_CONFIG.options
  }

  if (config.modules.includes('mdc')) {
    modules.push(MDC_CONFIG.module)
  }

  if (config.modules.includes('icon')) {
    modules.push(ICON_CONFIG.module)
  }

  if (config.modules.includes('fonts')) {
    modules.push(FONTS_CONFIG.module)
  }

  if (config.modules.includes('scripts')) {
    modules.push(SCRIPTS_CONFIG.module)
  }

  if (config.modules.includes('devtools')) {
    modules.push(DEVTOOLS_CONFIG.module)
  }

  if (config.modules.includes('hints')) {
    modules.push(HINTS_CONFIG.module)
  }

  if (config.optionalModules.includes('content')) {
    modules.push(CONTENT_CONFIG.module)
  }

  if (config.optionalModules.includes('image')) {
    modules.push(IMAGE_CONFIG.module)
  }

  return { modules, css, securityOptions }
}
