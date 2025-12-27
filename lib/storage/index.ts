import type { ScaffoldConfig } from '../types'
import { addScriptsToPackageJson, logger } from '../utils'
import { setupDocker } from './docker'
import { setupDrizzle } from './drizzle'
import { setupPrisma } from './prisma'
import { setupEnv } from './env'

export { setupDocker, setupDrizzle, setupPrisma, setupEnv }

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
