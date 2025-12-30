#!/usr/bin/env bun

import * as p from '@clack/prompts'
import { resolve, basename } from 'path'
import { existsSync, readdirSync } from 'fs'
import pc from 'picocolors'
import { runPrompts, printConfig } from './lib/prompts'
import { setupModules, setupOfficialModules, collectModulePackages, getModuleConfigs } from './lib/modules'
import { setupStorage, collectStoragePackages, getRedisNitroConfig } from './lib/storage'
import { setupBetterAuth, collectAuthPackages } from './lib/services'
import { setupTooling, TOOLING_PACKAGES } from './lib/tooling'
import { createErrorHandlingUtility, createSharedUtilsIndex } from './lib/files'
import { exec, execInteractive, bunInstallWithProgress, writeFile, readFile, ensureDir, addScriptsToPackageJson, logger } from './lib/utils'
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
  const command = `bun create nuxt@latest ${config.projectName} --template minimal --packageManager bun --gitInit ${forceFlag}`.trim().replace(/\s+/g, ' ')

  if (config.dryRun) {
    logger.command(command)
    logger.dim('  (Interactive Nuxt CLI would run here)')
    return true
  }

  console.log() // Add spacing before interactive CLI
  const success = await execInteractive(command, {
    cwd: isCurrentDir ? config.projectPath : resolve(config.projectPath, '..'),
  })

  if (!success) {
    logger.error('Failed to create Nuxt project')
    return false
  }

  console.log() // Add spacing after interactive CLI
  logger.success('Nuxt project created')
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

  // Collect from auth/services
  const authPackages = collectAuthPackages(config)
  deps.push(...authPackages.deps)
  devDeps.push(...authPackages.devDeps)

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

async function updateNuxtConfig(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Updating nuxt.config.ts...')

  const configPath = resolve(config.projectPath, 'nuxt.config.ts')
  const { modules, css, securityOptions } = getModuleConfigs(config)

  // If no additional modules/config needed, skip
  if (modules.length === 0 && css.length === 0 && !securityOptions && !config.storage.includes('redis')) {
    logger.dim('  No additional config needed')
    return true
  }

  if (config.dryRun) {
    logger.dim('  Would add modules: ' + modules.join(', '))
    if (css.length > 0) logger.dim('  Would add css: ' + css.join(', '))
    if (securityOptions) logger.dim('  Would add security config')
    if (config.storage.includes('redis')) logger.dim('  Would add redis nitro config')
    return true
  }

  // Read existing config
  let existingConfig = readFile(configPath)
  if (!existingConfig) {
    logger.error('nuxt.config.ts not found')
    return false
  }

  // Add modules to existing modules array
  if (modules.length > 0) {
    const modulesStr = modules.map(m => `'${m}'`).join(', ')
    
    // Check if modules array exists
    if (existingConfig.includes('modules: [')) {
      // Append to existing modules array - find the closing bracket
      existingConfig = existingConfig.replace(
        /modules:\s*\[([\s\S]*?)\]/,
        (match, content) => {
          const trimmedContent = content.trim()
          if (trimmedContent) {
            // Has existing modules, append with comma
            return `modules: [${content.trimEnd()}, ${modulesStr}]`
          } else {
            // Empty modules array
            return `modules: [${modulesStr}]`
          }
        }
      )
    } else {
      // No modules array, add one after devtools line
      existingConfig = existingConfig.replace(
        /(devtools:\s*\{[^}]*\},?)/,
        `$1\n  modules: [${modulesStr}],`
      )
    }
  }

  // Add CSS if needed
  if (css.length > 0) {
    const cssStr = css.map(c => `'${c}'`).join(', ')
    
    if (existingConfig.includes('css: [')) {
      existingConfig = existingConfig.replace(
        /css:\s*\[([\s\S]*?)\]/,
        (match, content) => {
          const trimmedContent = content.trim()
          if (trimmedContent) {
            return `css: [${content.trimEnd()}, ${cssStr}]`
          } else {
            return `css: [${cssStr}]`
          }
        }
      )
    } else {
      // Ensure trailing comma on previous property
      existingConfig = existingConfig.replace(
        /(\]|\}|'|"|\w)\s*\n(\s*\}\)\s*)$/,
        '$1,\n$2'
      )
      existingConfig = existingConfig.replace(
        /(\n\s*)(\}\)\s*)$/,
        `$1  css: [${cssStr}],\n$2`
      )
    }
  }

  // Add security config if needed
  if (securityOptions) {
    if (!existingConfig.includes('security:')) {
      // Ensure trailing comma on previous property
      existingConfig = existingConfig.replace(
        /(\]|\}|'|"|\w)\s*\n(\s*\}\)\s*)$/,
        '$1,\n$2'
      )
      existingConfig = existingConfig.replace(
        /(\n\s*)(\}\)\s*)$/,
        `$1  security: {\n    csrf: true,\n  },\n$2`
      )
    }
  }

  // Add redis nitro config if needed
  if (config.storage.includes('redis')) {
    if (!existingConfig.includes('nitro:')) {
      const redisConfig = getRedisNitroConfig()
      // Ensure trailing comma on previous property
      existingConfig = existingConfig.replace(
        /(\]|\}|'|"|\w)\s*\n(\s*\}\)\s*)$/,
        '$1,\n$2'
      )
      existingConfig = existingConfig.replace(
        /(\n\s*)(\}\)\s*)$/,
        `$1${redisConfig}\n$2`
      )
    }
  }

  writeFile(configPath, existingConfig, { dryRun: config.dryRun })
  logger.success('nuxt.config.ts updated')
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
    // Step 1: Configure official modules (installed by Nuxt CLI)
    await setupOfficialModules(normalizedConfig)

    // Step 2: Install additional packages (non-official modules, storage, tooling)
    // Note: Official modules and Nuxt are already installed by `bun create nuxt@latest`
    const packagesInstalled = await installAllPackages(normalizedConfig)
    if (!packagesInstalled) {
      logger.error('Failed to install packages')
      process.exit(1)
    }

    // Step 3: Setup modules (nuxt module add for non-official + file creation)
    await setupModules(normalizedConfig)

    // Step 4: Setup storage (file creation only, packages already installed)
    await setupStorage(normalizedConfig)

    // Step 5: Setup auth/services (file creation only, packages already installed)
    if (normalizedConfig.auth === 'better-auth') {
      await setupBetterAuth(normalizedConfig)
    }

    // Step 6: Setup tooling (file creation only, packages already installed)
    await setupTooling(normalizedConfig)

    // Step 7: Create shared utilities
    await createErrorHandlingUtility(normalizedConfig)
    await createSharedUtilsIndex(normalizedConfig)

    // Step 8: Update nuxt.config.ts with our additions
    await updateNuxtConfig(normalizedConfig)

    // Step 9: Create test directories and workflows
    await createTestDirectories(normalizedConfig)
    await createGitHubWorkflows(normalizedConfig)

    logger.success('Project scaffolded successfully!')

    const nextSteps = [
      ...(isCurrentDir ? [] : [pc.cyan(`  cd ${normalizedConfig.projectName}`)]),
      ...(normalizedConfig.storage.length > 0 ? [pc.cyan('  bun run db:start')] : []),
      pc.cyan('  bun run dev'),
    ].join('\n')

    // Build auth-related messages
    let authMessage = ''
    if (normalizedConfig.auth === 'better-auth') {
      authMessage += '\n\n' + pc.bold('📦 Better Auth Setup:\n')

      if (normalizedConfig.orm === 'drizzle') {
        authMessage += pc.dim('  Generate auth schema:\n')
        authMessage += pc.cyan('    bunx @better-auth/cli generate --config ./server/utils/auth.ts --output ./server/database/schema\n')
        authMessage += pc.cyan('    bun run db:generate && bun run db:migrate\n')
      } else if (normalizedConfig.orm === 'prisma') {
        authMessage += pc.dim('  Generate auth schema:\n')
        authMessage += pc.cyan('    bunx @better-auth/cli generate --config ./server/utils/auth.ts\n')
        authMessage += pc.cyan('    bun run db:generate && bun run db:migrate\n')
      } else {
        authMessage += pc.dim('  Using stateless auth (no database required)\n')
      }

      if (normalizedConfig.emailService === 'nodemailer') {
        authMessage += '\n' + pc.bold('📧 Gmail SMTP Setup:\n')
        authMessage += pc.dim('  1. Enable 2FA on your Google account\n')
        authMessage += pc.dim('  2. Generate an App Password: https://myaccount.google.com/apppasswords\n')
        authMessage += pc.dim('  3. Add GMAIL_USER and GMAIL_PASS to your .env file\n')
      }
    }

    p.outro(
      pc.green('✨ Your Nuxt project is ready!\n\n') +
        pc.dim('Next steps:\n') +
        nextSteps +
        authMessage +
        '\n'
    )
  } catch (error) {
    logger.error((error as Error).message)
    process.exit(1)
  }
}

main()
