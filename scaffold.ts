#!/usr/bin/env bun

import * as p from '@clack/prompts'
import { resolve, basename } from 'path'
import { existsSync, readdirSync } from 'fs'
import pc from 'picocolors'
import { runPrompts, printConfig } from './lib/prompts'
import { setupModules, collectModulePackages, getModuleConfigs } from './lib/modules'
import { setupStorage, collectStoragePackages, getRedisNitroConfig } from './lib/storage'
import { setupTooling, TOOLING_PACKAGES } from './lib/tooling'
import { createErrorHandlingUtility, createSharedUtilsIndex } from './lib/files'
import { exec, bunInstallWithProgress, writeFile, ensureDir, addScriptsToPackageJson, logger } from './lib/utils'
import type { ScaffoldConfig } from './lib/types'

function isDirectoryEmpty(path: string): boolean {
  try {
    const files = readdirSync(path)
    return files.length === 0
  } catch {
    return true
  }
}

async function initializeNuxtProject(config: ScaffoldConfig): Promise<boolean> {
  logger.title('Initializing Nuxt Project')

  const isCurrentDir = config.projectName === '.'
  const targetDir = isCurrentDir
    ? config.projectPath
    : resolve(config.projectPath, '..', config.projectName)

  if (isCurrentDir) {
    // Scaffolding in current directory - check if non-empty
    if (!isDirectoryEmpty(targetDir)) {
      const proceed = await p.confirm({
        message: `Current directory is not empty. Files may be overwritten. Continue?`,
        initialValue: false,
      })

      if (p.isCancel(proceed) || !proceed) {
        p.cancel('Operation cancelled.')
        return false
      }
    }
  } else {
    // Creating new directory - check if it already exists
    if (existsSync(targetDir)) {
      p.cancel(`Directory "${config.projectName}" already exists. Please choose a different name or remove the existing directory.`)
      return false
    }
  }

  const forceFlag = isCurrentDir ? '--force' : ''
  const command = `bunx nuxi init ${config.projectName} --template minimal --packageManager bun --gitInit true ${forceFlag} --no-install --modules ""`.trim().replace(/\s+/g, ' ')

  if (config.dryRun) {
    logger.command(command)
    return true
  }

  const spinner = p.spinner()
  spinner.start('Creating Nuxt project...')

  const result = await exec(command, {
    cwd: isCurrentDir ? config.projectPath : resolve(config.projectPath, '..'),
    dryRun: config.dryRun,
  })

  if (!result.success) {
    spinner.stop('Failed to create Nuxt project')
    logger.error(result.output)
    return false
  }

  spinner.stop('Nuxt project created')
  return true
}

interface AllPackages {
  deps: string[]
  devDeps: string[]
}

function collectAllPackages(config: ScaffoldConfig): AllPackages {
  const deps: string[] = []
  const devDeps: string[] = []

  // Collect from modules
  const modulePackages = collectModulePackages(config)
  deps.push(...modulePackages.deps)
  devDeps.push(...modulePackages.devDeps)

  // Collect from storage
  const storagePackages = collectStoragePackages(config)
  deps.push(...storagePackages.deps)
  devDeps.push(...storagePackages.devDeps)

  // Collect from tooling
  devDeps.push(...TOOLING_PACKAGES.devDeps)

  // Remove duplicates
  return {
    deps: [...new Set(deps)],
    devDeps: [...new Set(devDeps)],
  }
}

async function installAllPackages(config: ScaffoldConfig): Promise<boolean> {
  logger.title('Installing Dependencies')

  const { deps, devDeps } = collectAllPackages(config)

  if (deps.length > 0) {
    logger.step(`Installing ${deps.length} dependencies...`)
    logger.dim(`  ${deps.join(', ')}`)
    const depsInstalled = await bunInstallWithProgress(deps, {
      cwd: config.projectPath,
      dryRun: config.dryRun,
    })
    if (!depsInstalled && !config.dryRun) {
      logger.error('Failed to install dependencies')
      return false
    }
    logger.success('Dependencies installed')
  }

  if (devDeps.length > 0) {
    logger.step(`Installing ${devDeps.length} dev dependencies...`)
    logger.dim(`  ${devDeps.join(', ')}`)
    const devDepsInstalled = await bunInstallWithProgress(devDeps, {
      cwd: config.projectPath,
      dev: true,
      dryRun: config.dryRun,
    })
    if (!devDepsInstalled && !config.dryRun) {
      logger.error('Failed to install dev dependencies')
      return false
    }
    logger.success('Dev dependencies installed')
  }

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

  // Normalize config for "." case
  const isCurrentDir = config.projectName === '.'
  const displayName = isCurrentDir ? basename(defaultPath) : config.projectName
  const normalizedConfig: ScaffoldConfig = {
    ...config,
    // For display purposes, use actual directory name
    projectName: displayName,
    // projectPath should point to the actual project directory
    projectPath: isCurrentDir ? defaultPath : resolve(defaultPath, config.projectName),
  }

  printConfig(normalizedConfig)

  // Pass original projectName for nuxi init command (could be ".")
  const initConfig: ScaffoldConfig = {
    ...normalizedConfig,
    projectName: config.projectName, // Keep original for nuxi init
  }

  const projectCreated = await initializeNuxtProject(initConfig)
  if (!projectCreated) {
    process.exit(1)
  }

  try {
    // Step 1a: Always install Nuxt first (required for nuxi module add to work)
    logger.title('Installing Nuxt')
    const spinner = p.spinner()
    spinner.start('Installing Nuxt dependencies...')
    
    const nuxtInstalled = await exec('bun install', {
      cwd: normalizedConfig.projectPath,
      dryRun: normalizedConfig.dryRun,
    })
    
    if (!nuxtInstalled.success && !normalizedConfig.dryRun) {
      spinner.stop('Failed to install Nuxt')
      logger.error(nuxtInstalled.output)
      process.exit(1)
    }
    spinner.stop('Nuxt installed')

    // Step 1b: Install additional packages (modules, storage, tooling)
    const packagesInstalled = await installAllPackages(normalizedConfig)
    if (!packagesInstalled) {
      logger.error('Failed to install packages')
      process.exit(1)
    }

    // Step 2: Setup modules (nuxi module add + file creation)
    await setupModules(normalizedConfig)

    // Step 3: Setup storage (file creation only, packages already installed)
    await setupStorage(normalizedConfig)

    // Step 4: Setup tooling (file creation only, packages already installed)
    await setupTooling(normalizedConfig)

    // Step 5: Create shared utilities
    await createErrorHandlingUtility(normalizedConfig)
    await createSharedUtilsIndex(normalizedConfig)

    // Step 6: Generate nuxt.config.ts
    await generateNuxtConfig(normalizedConfig)

    // Step 7: Create test directories and workflows
    await createTestDirectories(normalizedConfig)
    await createGitHubWorkflows(normalizedConfig)

    logger.success('Project scaffolded successfully!')

    const nextSteps = [
      ...(isCurrentDir ? [] : [pc.cyan(`  cd ${normalizedConfig.projectName}`)]),
      ...(normalizedConfig.storage.length > 0 ? [pc.cyan('  bun run db:start')] : []),
      pc.cyan('  bun run dev'),
    ].join('\n')

    p.outro(
      pc.green('✨ Your Nuxt project is ready!\n\n') +
        pc.dim('Next steps:\n') +
        nextSteps + '\n'
    )
  } catch (error) {
    logger.error((error as Error).message)
    process.exit(1)
  }
}

main()
