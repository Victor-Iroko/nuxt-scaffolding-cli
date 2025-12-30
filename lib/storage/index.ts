import type { ScaffoldConfig } from '../types'
import { addScriptsToPackageJson, logger } from '../utils'
import { setupDocker } from './docker'
import { setupDrizzle, DRIZZLE_PACKAGES } from './drizzle'
import { setupPrisma, PRISMA_PACKAGES } from './prisma'
import { setupEnv, ENV_PACKAGES } from './env'

export { setupDocker, setupDrizzle, setupPrisma, setupEnv }
export { DRIZZLE_PACKAGES, PRISMA_PACKAGES, ENV_PACKAGES }

export interface StoragePackages {
  deps: string[]
  devDeps: string[]
}

export function collectStoragePackages(config: ScaffoldConfig): StoragePackages {
  const deps: string[] = []
  const devDeps: string[] = []

  // Env packages are needed if any storage is selected or auth is selected
  if (config.storage.length > 0 || config.auth === 'better-auth') {
    deps.push(...ENV_PACKAGES.deps)
    devDeps.push(...ENV_PACKAGES.devDeps)
  }

  // ORM packages
  if (config.storage.includes('postgres')) {
    if (config.orm === 'drizzle') {
      deps.push(...DRIZZLE_PACKAGES.deps)
      devDeps.push(...DRIZZLE_PACKAGES.devDeps)
    } else if (config.orm === 'prisma') {
      deps.push(...PRISMA_PACKAGES.deps)
      devDeps.push(...PRISMA_PACKAGES.devDeps)
    }
  }

  return { deps, devDeps }
}

export async function setupStorage(config: ScaffoldConfig): Promise<boolean> {
  logger.title('Setting up Storage')

  let allSuccess = true

  const dockerSuccess = await setupDocker(config)
  if (!dockerSuccess) allSuccess = false

  const envSuccess = await setupEnv(config)
  if (!envSuccess) allSuccess = false

  if (config.storage.includes('postgres')) {
    if (config.orm === 'drizzle') {
      const drizzleSuccess = await setupDrizzle(config)
      if (!drizzleSuccess) allSuccess = false
    } else if (config.orm === 'prisma') {
      const prismaSuccess = await setupPrisma(config)
      if (!prismaSuccess) allSuccess = false
    }
  }

  if (config.storage.length > 0) {
    addScriptsToPackageJson(
      config.projectPath,
      {
        'db:start': 'docker compose up -d',
        'db:stop': 'docker compose stop',
        'db:down': 'docker compose down',
        'db:destroy': 'docker compose down -v',
      },
      { dryRun: config.dryRun }
    )
  }

  return allSuccess
}

export function getRedisNitroConfig(): string {
  return `  nitro: {
    storage: {
      redis: {
        driver: 'redis',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    },
  },`
}
