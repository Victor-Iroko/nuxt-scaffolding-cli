import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { bunInstall, writeFile, ensureDir, logger } from '../utils'

export async function installContent(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @nuxt/content...')

  const installed = await bunInstall(['@nuxt/content'], {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!installed && !config.dryRun) {
    logger.error('Failed to install @nuxt/content')
    return false
  }

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

  logger.success('@nuxt/content installed')
  return true
}

export const CONTENT_CONFIG = {
  module: '@nuxt/content',
}
