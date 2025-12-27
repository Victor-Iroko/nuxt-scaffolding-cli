import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { bunInstall, writeFile, ensureDir, logger } from '../utils'

export async function installNuxtUI(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @nuxt/ui...')

  const installed = await bunInstall(['@nuxt/ui'], {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!installed && !config.dryRun) {
    logger.error('Failed to install @nuxt/ui')
    return false
  }

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

  logger.success('@nuxt/ui installed')
  logger.dim('  → Add to nuxt.config.ts: modules: ["@nuxt/ui"]')
  logger.dim('  → Add to nuxt.config.ts: css: ["~/assets/css/main.css"]')

  return true
}

export const NUXT_UI_CONFIG = {
  module: '@nuxt/ui',
  css: '~/assets/css/main.css',
}
