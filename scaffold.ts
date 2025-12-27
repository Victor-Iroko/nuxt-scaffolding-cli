#!/usr/bin/env bun

import * as p from '@clack/prompts'
import { resolve, basename } from 'path'
import pc from 'picocolors'
import { runPrompts, printConfig } from './lib/prompts'
import { installModules, getModuleConfigs } from './lib/modules'
import { setupStorage, getRedisNitroConfig } from './lib/storage'
import { setupTooling } from './lib/tooling'
import { createErrorHandlingUtility, createSharedUtilsIndex } from './lib/files'
import { exec, writeFile, ensureDir, addScriptsToPackageJson, logger } from './lib/utils'
import type { ScaffoldConfig } from './lib/types'

async function initializeNuxtProject(config: ScaffoldConfig): Promise<boolean> {
  logger.title('Initializing Nuxt Project')

  if (config.dryRun) {
    logger.command(`bun create nuxt@latest ${config.projectName}`)
    return true
  }

  const spinner = p.spinner()
  spinner.start('Creating Nuxt project...')

  const result = await exec(`bun create nuxt@latest ${config.projectName}`, {
    cwd: resolve(config.projectPath, '..'),
    dryRun: config.dryRun,
  })

  if (!result.success) {
    spinner.stop('Failed to create Nuxt project')
    return false
  }

  spinner.stop('Nuxt project created')
  return true
}

async function generateNuxtConfig(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Generating nuxt.config.ts...')

  const { modules, css, securityOptions } = getModuleConfigs(config)

  let configContent = `// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '${new Date().toISOString().split('T')[0]}',
  devtools: { enabled: true },
`

  if (modules.length > 0) {
    configContent += `
  modules: [
${modules.map((m) => `    '${m}',`).join('\n')}
  ],
`
  }

  if (css.length > 0) {
    configContent += `
  css: [
${css.map((c) => `    '${c}',`).join('\n')}
  ],
`
  }

  if (securityOptions) {
    configContent += `
  security: {
    csrf: true,
  },
`
  }

  if (config.storage.includes('redis')) {
    configContent += `
${getRedisNitroConfig()}
`
  }

  configContent += `})
`

  writeFile(resolve(config.projectPath, 'nuxt.config.ts'), configContent, {
    dryRun: config.dryRun,
  })

  logger.success('nuxt.config.ts generated')
  return true
}

async function createTestDirectories(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Creating test directories...')

  ensureDir(resolve(config.projectPath, 'tests', 'unit'), { dryRun: config.dryRun })
  ensureDir(resolve(config.projectPath, 'tests', 'e2e'), { dryRun: config.dryRun })
  ensureDir(resolve(config.projectPath, 'tests', 'nuxt'), { dryRun: config.dryRun })

  return true
}

async function createGitHubWorkflows(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Creating GitHub Actions workflows...')

  ensureDir(resolve(config.projectPath, '.github', 'workflows'), {
    dryRun: config.dryRun,
  })

  const hasDatabase = config.storage.includes('postgres')

  const productionWorkflow = `name: Production CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Lint
        run: bun lint
      
      - name: Format check
        run: bun format
      
      - name: Build
        run: bun run build
      
      - name: Test
        run: bun test
${
  hasDatabase
    ? `
  migrate:
    runs-on: ubuntu-latest
    needs: build
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run migrations
        run: bun run db:migrate
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
`
    : ''
}
`

  writeFile(
    resolve(config.projectPath, '.github', 'workflows', 'production.yml'),
    productionWorkflow,
    { dryRun: config.dryRun }
  )

  const previewWorkflow = `name: Preview CI

on:
  push:
    branches: [preview, develop]
  pull_request:
    branches: [preview, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Lint
        run: bun lint
      
      - name: Format check
        run: bun format
      
      - name: Build
        run: bun run build
      
      - name: Test
        run: bun test
${
  hasDatabase
    ? `
  migrate:
    runs-on: ubuntu-latest
    needs: build
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run migrations (test database)
        run: bun run db:migrate
        env:
          DATABASE_URL: \${{ secrets.TEST_DATABASE_URL }}
`
    : ''
}
`

  writeFile(
    resolve(config.projectPath, '.github', 'workflows', 'preview.yml'),
    previewWorkflow,
    { dryRun: config.dryRun }
  )

  logger.success('GitHub workflows created')
  return true
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  if (dryRun) {
    console.log(pc.yellow('\n🔍 Running in dry-run mode - no changes will be made\n'))
  }

  const defaultPath = process.cwd()
  const config = await runPrompts(defaultPath, dryRun)

  if (!config) {
    process.exit(0)
  }

  printConfig(config)

  const spinner = p.spinner()

  try {
    spinner.start('Scaffolding project...')

    await installModules(config)

    await setupStorage(config)

    await setupTooling(config)

    await createErrorHandlingUtility(config)
    await createSharedUtilsIndex(config)

    await generateNuxtConfig(config)

    await createTestDirectories(config)
    await createGitHubWorkflows(config)

    spinner.stop('Project scaffolded successfully!')

    p.outro(
      pc.green('✨ Your Nuxt project is ready!\n\n') +
        pc.dim('Next steps:\n') +
        pc.cyan(`  cd ${config.projectName}\n`) +
        pc.cyan('  bun install\n') +
        (config.storage.length > 0 ? pc.cyan('  bun run db:start\n') : '') +
        pc.cyan('  bun run dev\n')
    )
  } catch (error) {
    spinner.stop('Scaffolding failed')
    logger.error((error as Error).message)
    process.exit(1)
  }
}

main()
