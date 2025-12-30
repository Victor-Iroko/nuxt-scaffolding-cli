import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, ensureDir, logger } from '../utils'

export const BETTER_AUTH_PACKAGES = {
  deps: ['better-auth'],
  devDeps: [],
}

export const NODEMAILER_PACKAGES = {
  deps: ['nodemailer'],
  devDeps: ['@types/nodemailer'],
}

export interface AuthPackages {
  deps: string[]
  devDeps: string[]
}

export function collectAuthPackages(config: ScaffoldConfig): AuthPackages {
  const deps: string[] = []
  const devDeps: string[] = []

  if (config.auth === 'better-auth') {
    deps.push(...BETTER_AUTH_PACKAGES.deps)
    devDeps.push(...BETTER_AUTH_PACKAGES.devDeps)

    if (config.emailService === 'nodemailer') {
      deps.push(...NODEMAILER_PACKAGES.deps)
      devDeps.push(...NODEMAILER_PACKAGES.devDeps)
    }
  }

  return { deps, devDeps }
}

function generateAuthServer(config: ScaffoldConfig): string {
  const hasRedis = config.storage.includes('redis')
  const hasDrizzle = config.orm === 'drizzle'
  const hasPrisma = config.orm === 'prisma'
  const hasEmail = config.emailService === 'nodemailer'
  const isStateless = config.orm === 'none'

  let imports = `import { betterAuth } from 'better-auth'\n`

  if (hasDrizzle) {
    imports += `import { drizzleAdapter } from 'better-auth/adapters/drizzle'\n`
    imports += `import { db } from './db'\n`
  } else if (hasPrisma) {
    imports += `import { prismaAdapter } from 'better-auth/adapters/prisma'\n`
    imports += `import { prisma } from './db'\n`
  }

  if (hasEmail) {
    imports += `// import { sendEmail } from './email'\n`
  }

  let databaseConfig = ''
  if (hasDrizzle) {
    databaseConfig = `  database: drizzleAdapter(db, {
    provider: 'pg',
  }),`
  } else if (hasPrisma) {
    databaseConfig = `  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),`
  }

  let sessionConfig = ''
  if (isStateless && !hasRedis) {
    sessionConfig = `  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      strategy: 'jwe',
      refreshCache: true,
    },
  },
  account: {
    storeStateStrategy: 'cookie',
    storeAccountCookie: true,
  },`
  } else if (hasRedis) {
    sessionConfig = `  secondaryStorage: {
    get: async (key) => {
      const storage = useStorage('redis')
      const value = await storage.getItem(key)
      return value as string | null
    },
    set: async (key, value, ttl) => {
      const storage = useStorage('redis')
      await storage.setItem(key, value, { ttl })
    },
    delete: async (key) => {
      const storage = useStorage('redis')
      await storage.removeItem(key)
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },`
  }

  const emailVerificationComment = hasEmail
    ? `    // Uncomment to enable email verification
    // requireEmailVerification: true,
    // sendVerificationEmail: async ({ user, url }) => {
    //   await sendEmail({
    //     to: user.email,
    //     subject: 'Verify your email',
    //     html: \`<p>Click <a href="\${url}">here</a> to verify your email.</p>\`,
    //   })
    // },`
    : ''

  return `${imports}
export const auth = betterAuth({
${databaseConfig}
${sessionConfig}
  emailAndPassword: {
    enabled: true,
${emailVerificationComment}
  },
  // Uncomment to enable Google OAuth
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID as string,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  //   },
  // },
})
`
}

function generateAuthClient(): string {
  return `import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient()
`
}

function generateAuthRouteHandler(): string {
  return `import { auth } from '~/server/utils/auth'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
`
}

function generateAuthStore(): string {
  return `import { authClient } from '~/utils/auth-client'

export const useAuthStore = defineStore('useAuthStore', () => {
  const session = ref<Awaited<ReturnType<typeof authClient.useSession>> | null>(null)

  async function init() {
    const data = await authClient.useSession(useFetch)
    session.value = data
  }

  const user = computed(() => session.value?.data?.user)
  const loading = computed(() => session.value?.isPending)

  return {
    init,
    user,
    loading,
  }
})
`
}

function generateAuthPlugin(): string {
  return `export default defineNuxtPlugin(async () => {
  await useAuthStore().init()
})
`
}

function generateAuthMiddleware(hasPinia: boolean): string {
  if (hasPinia) {
    return `export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // If the route has 'auth: false' in its meta, skip the check
  if (to.meta.auth === false) {
    return
  }

  // Otherwise, check if user is logged in
  if (!authStore.user) {
    return navigateTo({
      path: '/login',
      query: {
        redirectTo: to.path,
      },
    })
  }
})
`
  }

  return `import { authClient } from '~/utils/auth-client'

export default defineNuxtRouteMiddleware(async (to) => {
  // If the route has 'auth: false' in its meta, skip the check
  if (to.meta.auth === false) {
    return
  }

  // Check session directly via auth client
  const { data } = await authClient.getSession()

  if (!data?.user) {
    return navigateTo({
      path: '/login',
      query: {
        redirectTo: to.path,
      },
    })
  }
})
`
}

function generateH3Types(): string {
  return `import type { auth } from '../utils/auth'

export type User = typeof auth.$Infer.Session.user

declare module 'h3' {
  interface H3EventContext {
    user?: User
  }
}
`
}

function generateSessionUtil(): string {
  return `import type { H3Event } from 'h3'
import { auth } from './auth'

export const requireAuth = async (event: H3Event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Set the context and return the user for convenience
  event.context.user = session.user
  return session.user
}
`
}

function generateEmailUtil(): string {
  return `import nodemailer from 'nodemailer'
import type { Transporter, SendMailOptions } from 'nodemailer'

const transporter: Transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

export async function sendEmail(options: Omit<SendMailOptions, 'from'>): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      ...options,
    })
    console.log('Email sent successfully:', info.response)
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
`
}

export async function setupBetterAuth(config: ScaffoldConfig): Promise<boolean> {
  if (config.auth !== 'better-auth') {
    logger.dim('No auth selected, skipping auth setup')
    return true
  }

  logger.step('Setting up Better Auth...')

  const hasPinia = config.modules.includes('pinia')

  // Ensure directories exist
  ensureDir(join(config.projectPath, 'server', 'utils'), { dryRun: config.dryRun })
  ensureDir(join(config.projectPath, 'server', 'api', 'auth'), { dryRun: config.dryRun })
  ensureDir(join(config.projectPath, 'server', 'types'), { dryRun: config.dryRun })
  ensureDir(join(config.projectPath, 'app', 'utils'), { dryRun: config.dryRun })
  ensureDir(join(config.projectPath, 'app', 'middleware'), { dryRun: config.dryRun })

  if (hasPinia) {
    ensureDir(join(config.projectPath, 'app', 'stores'), { dryRun: config.dryRun })
    ensureDir(join(config.projectPath, 'app', 'plugins'), { dryRun: config.dryRun })
  }

  // Generate auth server
  writeFile(
    join(config.projectPath, 'server', 'utils', 'auth.ts'),
    generateAuthServer(config),
    { dryRun: config.dryRun }
  )

  // Generate auth client
  writeFile(
    join(config.projectPath, 'app', 'utils', 'auth-client.ts'),
    generateAuthClient(),
    { dryRun: config.dryRun }
  )

  // Generate route handler
  writeFile(
    join(config.projectPath, 'server', 'api', 'auth', '[...all].ts'),
    generateAuthRouteHandler(),
    { dryRun: config.dryRun }
  )

  // Generate auth store (only if Pinia is selected)
  if (hasPinia) {
    writeFile(
      join(config.projectPath, 'app', 'stores', 'auth-store.ts'),
      generateAuthStore(),
      { dryRun: config.dryRun }
    )

    // Generate auth plugin
    writeFile(
      join(config.projectPath, 'app', 'plugins', 'auth-plugin.ts'),
      generateAuthPlugin(),
      { dryRun: config.dryRun }
    )
  }

  // Generate auth middleware
  writeFile(
    join(config.projectPath, 'app', 'middleware', 'auth-middleware.global.ts'),
    generateAuthMiddleware(hasPinia),
    { dryRun: config.dryRun }
  )

  // Generate H3 types
  writeFile(
    join(config.projectPath, 'server', 'types', 'h3.ts'),
    generateH3Types(),
    { dryRun: config.dryRun }
  )

  // Generate session util
  writeFile(
    join(config.projectPath, 'server', 'utils', 'session.ts'),
    generateSessionUtil(),
    { dryRun: config.dryRun }
  )

  // Generate email util (only if nodemailer is selected)
  if (config.emailService === 'nodemailer') {
    writeFile(
      join(config.projectPath, 'server', 'utils', 'email.ts'),
      generateEmailUtil(),
      { dryRun: config.dryRun }
    )
  }

  logger.success('Better Auth configured')
  return true
}
