import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { bunInstall, exec, writeFile, ensureDir, addScriptsToPackageJson, logger } from '../utils'

export async function setupPrisma(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up Prisma ORM...')

  const installed = await bunInstall(['@prisma/client'], {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!installed && !config.dryRun) {
    logger.error('Failed to install Prisma client')
    return false
  }

  const devInstalled = await bunInstall(['prisma'], {
    cwd: config.projectPath,
    dev: true,
    dryRun: config.dryRun,
  })

  if (!devInstalled && !config.dryRun) {
    logger.error('Failed to install Prisma dev dependencies')
    return false
  }

  if (!config.dryRun) {
    await exec('npx prisma init', { cwd: config.projectPath })
  } else {
    logger.command('npx prisma init')
  }

  const prismaSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add your models here
// model User {
//   id        String   @id @default(cuid())
//   email     String   @unique
//   name      String?
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
`

  ensureDir(join(config.projectPath, 'prisma'), { dryRun: config.dryRun })
  writeFile(join(config.projectPath, 'prisma', 'schema.prisma'), prismaSchema, {
    dryRun: config.dryRun,
  })

  const dbUtil = `import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
`

  ensureDir(join(config.projectPath, 'server', 'utils'), { dryRun: config.dryRun })
  writeFile(join(config.projectPath, 'server', 'utils', 'db.ts'), dbUtil, {
    dryRun: config.dryRun,
  })

  const seedFile = `import { prisma } from '../utils/db'

async function seed() {
  console.log('🌱 Seeding database...')
  
  // Add your seed logic here
  // await prisma.user.createMany({ data: [...] })
  
  console.log('✅ Seeding complete!')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
`

  ensureDir(join(config.projectPath, 'server', 'database'), { dryRun: config.dryRun })
  writeFile(join(config.projectPath, 'server', 'database', 'seed.ts'), seedFile, {
    dryRun: config.dryRun,
  })

  addScriptsToPackageJson(
    config.projectPath,
    {
      'db:generate': 'prisma generate',
      'db:migrate': 'dotenv -e .env -- prisma migrate dev',
      'db:migrate:prod': 'dotenv -e .env -- prisma migrate deploy',
      'db:seed': 'bun run ./server/database/seed.ts',
      'db:studio': 'prisma studio',
    },
    { dryRun: config.dryRun }
  )

  logger.success('Prisma ORM configured')
  return true
}
