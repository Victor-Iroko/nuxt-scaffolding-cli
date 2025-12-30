export type NuxtModule =
  | 'pinia'
  | 'vueuse'
  | 'motion'
  | 'seo'
  | 'security'
  | 'mdc'

export type StorageOption = 'postgres' | 'mongo' | 'minio' | 'redis' | 'qdrant'

export type OrmChoice = 'drizzle' | 'prisma' | 'none'

export type AuthChoice = 'better-auth' | 'none'

export type EmailServiceChoice = 'nodemailer' | 'none'

export interface ScaffoldConfig {
  projectName: string
  projectPath: string
  modules: NuxtModule[]
  storage: StorageOption[]
  orm: OrmChoice
  auth: AuthChoice
  emailService: EmailServiceChoice
  dryRun: boolean
}

export interface ModuleInstaller {
  name: string
  install: (config: ScaffoldConfig) => Promise<boolean>
}

export const RECOMMENDED_MODULES: { value: NuxtModule; label: string; hint: string; disabled?: boolean }[] = [
  // Non-official / community modules (official ones are handled by Nuxt CLI)
  { value: 'pinia', label: '@pinia/nuxt', hint: 'State management + persistedstate' },
  { value: 'vueuse', label: '@vueuse/nuxt', hint: 'Vue Composition Utilities' },
  { value: 'motion', label: '@vueuse/motion', hint: 'Animation directives' },
  { value: 'seo', label: '@nuxtjs/seo', hint: 'Complete SEO solution' },
  { value: 'security', label: 'nuxt-security', hint: 'Security based on OWASP Top 10' },
  { value: 'mdc', label: '@nuxtjs/mdc', hint: 'Markdown components' },
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

export const AUTH_OPTIONS: { value: AuthChoice; label: string; hint: string }[] = [
  { value: 'better-auth', label: 'Better Auth', hint: 'Full-featured auth with sessions' },
  { value: 'none', label: 'None', hint: 'Skip auth setup' },
]

export const EMAIL_SERVICE_OPTIONS: { value: EmailServiceChoice; label: string; hint: string }[] = [
  { value: 'nodemailer', label: 'Nodemailer (Gmail SMTP)', hint: 'Email via Gmail' },
  { value: 'none', label: 'None', hint: 'Skip email setup' },
]
