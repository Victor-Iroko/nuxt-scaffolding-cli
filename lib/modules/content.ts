import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, ensureDir, logger } from '../utils'

export const CONTENT_PACKAGES = {
  deps: ['@nuxt/content'],
}

export async function setupContent(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up @nuxt/content...')

  const contentConfig = `import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
    }),
  },
})
`

  writeFile(join(config.projectPath, 'content.config.ts'), contentConfig, {
    dryRun: config.dryRun,
  })

  ensureDir(join(config.projectPath, 'content'), { dryRun: config.dryRun })

  const indexMd = `---
title: Welcome
description: Your first content page
---

# Welcome

This is your first content page.
`

  writeFile(join(config.projectPath, 'content', 'index.md'), indexMd, {
    dryRun: config.dryRun,
  })

  logger.success('@nuxt/content configured')
  return true
}

export const CONTENT_CONFIG = {
  module: '@nuxt/content',
}
