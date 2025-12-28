import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, ensureDir, logger } from '../utils'

export const NUXT_UI_PACKAGES = {
  deps: ['@nuxt/ui'],
}

export async function setupNuxtUI(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up @nuxt/ui...')

  const cssDir = join(config.projectPath, 'app', 'assets', 'css')
  ensureDir(cssDir, { dryRun: config.dryRun })

  const cssContent = `@import "tailwindcss";
@import "@nuxt/ui";
`

  writeFile(join(cssDir, 'main.css'), cssContent, { dryRun: config.dryRun })

  const appVueContent = `<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
`

  writeFile(join(config.projectPath, 'app', 'app.vue'), appVueContent, {
    dryRun: config.dryRun,
  })

  logger.success('@nuxt/ui configured')
  return true
}

export const NUXT_UI_CONFIG = {
  module: '@nuxt/ui',
  css: '~/assets/css/main.css',
}
