import { join } from 'path'
import type { ScaffoldConfig, StorageOption } from '../types'
import { writeFile, logger } from '../utils'

interface DockerService {
  image: string
  container_name: string
  ports: string[]
  environment?: Record<string, string>
  volumes?: string[]
  restart?: string
}

function getPostgresService(projectName: string): DockerService {
  return {
    image: 'postgres:16-alpine',
    container_name: `${projectName}-postgres`,
    ports: ['5432:5432'],
    environment: {
      POSTGRES_USER: '${POSTGRES_USER}',
      POSTGRES_PASSWORD: '${POSTGRES_PASSWORD}',
      POSTGRES_DB: '${POSTGRES_DB}',
    },
    volumes: ['postgres_data:/var/lib/postgresql/data'],
    restart: 'unless-stopped',
  }
}

function getMongoService(projectName: string): DockerService {
  return {
    image: 'mongo:7',
    container_name: `${projectName}-mongo`,
    ports: ['27017:27017'],
    environment: {
      MONGO_INITDB_ROOT_USERNAME: '${MONGO_INITDB_ROOT_USERNAME}',
      MONGO_INITDB_ROOT_PASSWORD: '${MONGO_INITDB_ROOT_PASSWORD}',
    },
    volumes: ['mongo_data:/data/db'],
    restart: 'unless-stopped',
  }
}

function getMinioService(projectName: string): DockerService {
  return {
    image: 'minio/minio:latest',
    container_name: `${projectName}-minio`,
    ports: ['9000:9000', '9001:9001'],
    environment: {
      MINIO_ROOT_USER: '${MINIO_ROOT_USER}',
      MINIO_ROOT_PASSWORD: '${MINIO_ROOT_PASSWORD}',
    },
    volumes: ['minio_data:/data'],
    restart: 'unless-stopped',
  }
}

function getRedisService(projectName: string): DockerService {
  return {
    image: 'redis:7-alpine',
    container_name: `${projectName}-redis`,
    ports: ['${REDIS_PORT:-6379}:6379'],
    volumes: ['redis_data:/data'],
    restart: 'unless-stopped',
  }
}

function getQdrantService(projectName: string): DockerService {
  return {
    image: 'qdrant/qdrant:latest',
    container_name: `${projectName}-qdrant`,
    ports: ['6333:6333', '6334:6334'],
    volumes: ['qdrant_data:/qdrant/storage'],
    restart: 'unless-stopped',
  }
}

function generateDockerCompose(projectName: string, storage: StorageOption[]): string {
  const services: Record<string, DockerService> = {}
  const volumes: string[] = []

  if (storage.includes('postgres')) {
    services.postgres = getPostgresService(projectName)
    volumes.push('postgres_data:')
  }

  if (storage.includes('mongo')) {
    services.mongo = getMongoService(projectName)
    volumes.push('mongo_data:')
  }

  if (storage.includes('minio')) {
    services.minio = getMinioService(projectName)
    volumes.push('minio_data:')
  }

  if (storage.includes('redis')) {
    services.redis = getRedisService(projectName)
    volumes.push('redis_data:')
  }

  if (storage.includes('qdrant')) {
    services.qdrant = getQdrantService(projectName)
    volumes.push('qdrant_data:')
  }

  let yaml = `services:\n`

  for (const [name, service] of Object.entries(services)) {
    yaml += `  ${name}:\n`
    yaml += `    image: ${service.image}\n`
    yaml += `    container_name: ${service.container_name}\n`
    yaml += `    ports:\n`
    for (const port of service.ports) {
      yaml += `      - "${port}"\n`
    }
    if (service.environment) {
      yaml += `    environment:\n`
      for (const [key, value] of Object.entries(service.environment)) {
        yaml += `      ${key}: ${value}\n`
      }
    }
    if (service.volumes) {
      yaml += `    volumes:\n`
      for (const vol of service.volumes) {
        yaml += `      - ${vol}\n`
      }
    }
    if (service.restart) {
      yaml += `    restart: ${service.restart}\n`
    }
    yaml += '\n'
  }

  if (volumes.length > 0) {
    yaml += `volumes:\n`
    for (const vol of volumes) {
      yaml += `  ${vol}\n`
    }
  }

  return yaml
}

export async function setupDocker(config: ScaffoldConfig): Promise<boolean> {
  if (config.storage.length === 0) {
    logger.dim('No storage options selected, skipping Docker setup')
    return true
  }

  logger.step('Creating docker-compose.yml...')

  const dockerCompose = generateDockerCompose(config.projectName, config.storage)

  writeFile(join(config.projectPath, 'docker-compose.yml'), dockerCompose, {
    dryRun: config.dryRun,
  })

  logger.success('docker-compose.yml created')
  return true
}
