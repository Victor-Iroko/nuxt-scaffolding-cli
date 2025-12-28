import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, ensureDir, addScriptsToPackageJson, logger } from '../utils'

export const DRIZZLE_PACKAGES = {
  deps: ['drizzle-orm', 'drizzle-zod'],
  devDeps: ['drizzle-kit', 'drizzle-seed', 'postgres'],
}

export async function setupDrizzle(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up Drizzle ORM...')

  const drizzleConfig = `import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema/index.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
  casing: 'snake_case',
})
`

  writeFile(join(config.projectPath, 'drizzle.config.ts'), drizzleConfig, {
    dryRun: config.dryRun,
  })

  ensureDir(join(config.projectPath, 'server', 'database', 'schema'), {
    dryRun: config.dryRun,
  })
  ensureDir(join(config.projectPath, 'server', 'database', 'migrations'), {
    dryRun: config.dryRun,
  })

  const schemaIndex = `// Export all your schema definitions here
// import { users } from './users'
// export { users }

export {}
`

  writeFile(
    join(config.projectPath, 'server', 'database', 'schema', 'index.ts'),
    schemaIndex,
    { dryRun: config.dryRun }
  )

  const dbUtil = `import { drizzle } from 'drizzle-orm/bun-sql'
import * as schema from '../database/schema'

export const db = drizzle(process.env.DATABASE_URL!, {
  schema,
  logger: true,
  casing: 'snake_case',
})
`

  ensureDir(join(config.projectPath, 'server', 'utils'), { dryRun: config.dryRun })
  writeFile(join(config.projectPath, 'server', 'utils', 'db.ts'), dbUtil, {
    dryRun: config.dryRun,
  })

  const seedFile = `import { reset, seed } from 'drizzle-seed'
import { db } from '../utils/db'
import * as schema from './schema'

async function main() {
  console.log('🌱 Seeding database...')

  // Reset all tables before seeding
  await reset(db, schema)

  // Seed with drizzle-seed
  // Customize the refine function based on your schema
  await seed(db, schema, { count: 20, seed: 234 }).refine((f) => ({
    // Example: customize seeding for specific tables
    // users: {
    //   columns: {
    //     name: f.fullName(),
    //     age: f.int({ minValue: 18, maxValue: 80 }),
    //     email: f.email(),
    //   },
    //   count: 10,
    // },
  }))

  console.log('✅ Seeding complete!')
}

main().catch(console.error)
`

  writeFile(join(config.projectPath, 'server', 'database', 'seed.ts'), seedFile, {
    dryRun: config.dryRun,
  })

  addScriptsToPackageJson(
    config.projectPath,
    {
      'db:generate': 'drizzle-kit generate',
      'db:migrate': 'dotenv -e .env -- drizzle-kit migrate',
      'db:seed': 'bun run ./server/database/seed.ts',
      'db:studio': 'dotenv -e .env -- drizzle-kit studio',
    },
    { dryRun: config.dryRun }
  )

  logger.success('Drizzle ORM configured')
  return true
}
