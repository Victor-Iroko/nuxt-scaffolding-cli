import type { ScaffoldConfig, NuxtModule, OptionalModule } from '../types'
import { logger } from '../utils'

import { installNuxtUI, NUXT_UI_CONFIG } from './nuxt-ui'
import { installEslint, ESLINT_CONFIG } from './eslint'
import { installTestUtils, TEST_UTILS_CONFIG } from './test-utils'
import { installContent, CONTENT_CONFIG } from './content'
import { installPinia, PINIA_CONFIG } from './pinia'
import { installVueuse, VUEUSE_CONFIG } from './vueuse'
import { installMotion, MOTION_CONFIG } from './motion'
import { installSeo, SEO_CONFIG } from './seo'
import { installSecurity, SECURITY_CONFIG } from './security'
import { installImage, IMAGE_CONFIG } from './image'
import { installMdc, MDC_CONFIG } from './mdc'

export {
  installNuxtUI,
  installEslint,
  installTestUtils,
  installContent,
  installPinia,
  installVueuse,
  installMotion,
  installSeo,
  installSecurity,
  installImage,
  installMdc,
}

const moduleInstallers: Record<NuxtModule, (config: ScaffoldConfig) => Promise<boolean>> = {
  'nuxt-ui': installNuxtUI,
  eslint: installEslint,
  'test-utils': installTestUtils,
  pinia: installPinia,
  vueuse: installVueuse,
  motion: installMotion,
  seo: installSeo,
  security: installSecurity,
  mdc: installMdc,
}

const optionalInstallers: Record<OptionalModule, (config: ScaffoldConfig) => Promise<boolean>> = {
  content: installContent,
  image: installImage,
}

export async function installModules(config: ScaffoldConfig): Promise<boolean> {
  logger.title('Installing Nuxt Modules')

  let allSuccess = true

  for (const mod of config.modules) {
    const installer = moduleInstallers[mod]
    if (installer) {
      const success = await installer(config)
      if (!success) allSuccess = false
    }
  }

  for (const mod of config.optionalModules) {
    const installer = optionalInstallers[mod]
    if (installer) {
      const success = await installer(config)
      if (!success) allSuccess = false
    }
  }

  return allSuccess
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

  if (config.optionalModules.includes('content')) {
    modules.push(CONTENT_CONFIG.module)
  }

  if (config.optionalModules.includes('image')) {
    modules.push(IMAGE_CONFIG.module)
  }

  return { modules, css, securityOptions }
}
