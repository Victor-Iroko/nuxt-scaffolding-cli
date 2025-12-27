export type NuxtModule =
  | 'nuxt-ui'
  | 'eslint'
  | 'test-utils'
  | 'pinia'
  | 'vueuse'
  | 'motion'
  | 'seo'
  | 'security'
  | 'mdc'

export type OptionalModule = 'content' | 'image'

export type StorageOption = 'postgres' | 'mongo' | 'minio' | 'redis' | 'qdrant'

export type OrmChoice = 'drizzle' | 'prisma' | 'none'

export interface ScaffoldConfig {
  projectName: string
  projectPath: string
  modules: NuxtModule[]
  optionalModules: OptionalModule[]
  storage: StorageOption[]
  orm: OrmChoice
  dryRun: boolean
}

export interface ModuleInstaller {
  name: string
  install: (config: ScaffoldConfig) => Promise<boolean>
}

export const RECOMMENDED_MODULES: { value: NuxtModule; label: string; hint: string }[] = [
  { value: 'nuxt-ui', label: '@nuxt/ui', hint: 'Intuitive UI Library powered by Tailwind CSS' },
  { value: 'eslint', label: '@nuxt/eslint', hint: 'ESLint integration with flat config' },
  { value: 'test-utils', label: '@nuxt/test-utils', hint: 'Testing utilities with Vitest' },
  { value: 'pinia', label: '@pinia/nuxt', hint: 'State management + persistedstate' },
  { value: 'vueuse', label: '@vueuse/nuxt', hint: 'Vue Composition Utilities' },
  { value: 'motion', label: '@vueuse/motion', hint: 'Animation directives' },
  { value: 'seo', label: '@nuxtjs/seo', hint: 'Complete SEO solution' },
  { value: 'security', label: 'nuxt-security', hint: 'Security based on OWASP Top 10' },
  { value: 'mdc', label: '@nuxtjs/mdc', hint: 'Markdown components' },
]

export const OPTIONAL_MODULES: { value: OptionalModule; label: string; hint: string }[] = [
  { value: 'content', label: '@nuxt/content', hint: 'File-based CMS with Markdown support' },
  { value: 'image', label: '@nuxt/image', hint: 'Image optimization with providers' },
]

export const STORAGE_OPTIONS: { value: StorageOption; label: string; hint: string }[] = [
  { value: 'postgres', label: 'PostgreSQL', hint: 'Relational database' },
  { value: 'mongo', label: 'MongoDB', hint: 'Document database' },
  { value: 'minio', label: 'MinIO', hint: 'S3-compatible object storage' },
  { value: 'redis', label: 'Redis', hint: 'In-memory cache/store' },
  { value: 'qdrant', label: 'Qdrant', hint: 'Vector database for AI' },
]

export const ORM_OPTIONS: { value: OrmChoice; label: string; hint: string }[] = [
  { value: 'drizzle', label: 'Drizzle ORM', hint: 'TypeScript ORM with Bun native support' },
  { value: 'prisma', label: 'Prisma', hint: 'Next-generation Node.js ORM' },
  { value: 'none', label: 'None', hint: 'Skip ORM setup' },
]
