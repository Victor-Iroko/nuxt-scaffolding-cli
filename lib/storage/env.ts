import { join } from 'path'
import type { ScaffoldConfig, StorageOption } from '../types'
import { bunInstall, writeFile, ensureDir, logger } from '../utils'

function generateEnvTemplate(storage: StorageOption[]): string {
  let env = `# App Configuration
NODE_ENV=development

`

  if (storage.includes('postgres')) {
    env += `# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_HOST=localhost
POSTGRES_PASSWORD=postgres
POSTGRES_DB=myapp

# Database URL: scheme://user:password@host:port/database?options
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp

`
  }

  if (storage.includes('mongo')) {
    env += `# MongoDB
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin

# MongoDB URL
MONGO_URL=mongodb://admin:admin@localhost:27017

`
  }

  if (storage.includes('minio')) {
    env += `# MinIO (S3-compatible)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# S3 Configuration
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=uploads

`
  }

  if (storage.includes('redis')) {
    env += `# Redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Redis URL: scheme://[:password@]host:port[/db_number]
REDIS_URL=redis://localhost:6379

`
  }

  if (storage.includes('qdrant')) {
    env += `# Qdrant (Vector Database)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

`
  }

  return env.trim() + '\n'
}

function generateEnvSchema(storage: StorageOption[]): string {
  let schema = `import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
`

  if (storage.includes('postgres')) {
    schema += `
  // PostgreSQL
  POSTGRES_USER: z.string().min(1),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  DATABASE_URL: z.string().url(),
`
  }

  if (storage.includes('mongo')) {
    schema += `
  // MongoDB
  MONGO_INITDB_ROOT_USERNAME: z.string().min(1),
  MONGO_INITDB_ROOT_PASSWORD: z.string().min(1),
  MONGO_URL: z.string().url().optional(),
`
  }

  if (storage.includes('minio')) {
    schema += `
  // MinIO / S3
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
`
  }

  if (storage.includes('redis')) {
    schema += `
  // Redis
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),
`
  }

  if (storage.includes('qdrant')) {
    schema += `
  // Qdrant
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
`
  }

  schema += `})

export type Env = z.infer<typeof envSchema>
`

  return schema
}

export async function setupEnv(config: ScaffoldConfig): Promise<boolean> {
  if (config.storage.length === 0) {
    logger.dim('No storage options selected, skipping env setup')
    return true
  }

  logger.step('Setting up environment variables...')

  const installed = await bunInstall(['zod'], {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!installed && !config.dryRun) {
    logger.error('Failed to install zod')
    return false
  }

  const devInstalled = await bunInstall(['dotenv-cli'], {
    cwd: config.projectPath,
    dev: true,
    dryRun: config.dryRun,
  })

  if (!devInstalled && !config.dryRun) {
    logger.error('Failed to install dotenv-cli')
    return false
  }

  const envTemplate = generateEnvTemplate(config.storage)
  writeFile(join(config.projectPath, '.env.example'), envTemplate, {
    dryRun: config.dryRun,
  })
  writeFile(join(config.projectPath, '.env'), envTemplate, {
    dryRun: config.dryRun,
  })

  ensureDir(join(config.projectPath, 'shared', 'utils'), { dryRun: config.dryRun })

  const envSchemaContent = generateEnvSchema(config.storage)
  writeFile(
    join(config.projectPath, 'shared', 'utils', 'env-schema.ts'),
    envSchemaContent,
    { dryRun: config.dryRun }
  )

  const envValidatePlugin = `import { envSchema } from '~~/shared/utils/env-schema'

export default defineNitroPlugin(() => {
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }
  
  console.log('✅ Environment variables validated')
})
`

  ensureDir(join(config.projectPath, 'server', 'plugins'), { dryRun: config.dryRun })
  writeFile(
    join(config.projectPath, 'server', 'plugins', 'env-validate.ts'),
    envValidatePlugin,
    { dryRun: config.dryRun }
  )

  logger.success('Environment setup complete')
  return true
}
