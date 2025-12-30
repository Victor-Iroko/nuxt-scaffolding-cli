import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, readFile, ensureDir, logger } from '../utils'

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

  // Add css to nuxt.config.ts
  if (!config.dryRun) {
    const configPath = join(config.projectPath, 'nuxt.config.ts')
    let existingConfig = readFile(configPath)
    
    if (existingConfig && !existingConfig.includes('~/assets/css/main.css')) {
      const cssEntry = "'~/assets/css/main.css'"
      
      if (existingConfig.includes('css: [')) {
        // Append to existing css array
        existingConfig = existingConfig.replace(
          /css:\s*\[([\s\S]*?)\]/,
          (match, content) => {
            const trimmedContent = content.trim()
            if (trimmedContent) {
              return `css: [${content.trimEnd()}, ${cssEntry}]`
            } else {
              return `css: [${cssEntry}]`
            }
          }
        )
      } else {
        // Add css array - ensure previous property has trailing comma
        // First, add comma after the last property if missing (e.g., after `]` or `}` before closing `})`)
        existingConfig = existingConfig.replace(
          /(\]|\}|'|"|\w)\s*\n(\s*\}\)\s*)$/,
          '$1,\n$2'
        )
        // Then add css array before closing
        existingConfig = existingConfig.replace(
          /(\n\s*)(\}\)\s*)$/,
          `$1  css: [${cssEntry}],\n$2`
        )
      }
      
      writeFile(configPath, existingConfig, { dryRun: config.dryRun })
    }
  }

  logger.success('@nuxt/ui configured')
  return true
}

export const NUXT_UI_CONFIG = {
  module: '@nuxt/ui',
  css: '~/assets/css/main.css',
}
