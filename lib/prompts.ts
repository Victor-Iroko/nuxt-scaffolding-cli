import * as p from '@clack/prompts'
import { basename } from 'path'
import pc from 'picocolors'
import {
  type ScaffoldConfig,
  type NuxtModule,
  type StorageOption,
  type OrmChoice,
  type AuthChoice,
  type EmailServiceChoice,
  RECOMMENDED_MODULES,
  STORAGE_OPTIONS,
  ORM_OPTIONS,
  AUTH_OPTIONS,
  EMAIL_SERVICE_OPTIONS,
} from './types'

export async function runPrompts(defaultPath: string, dryRun: boolean): Promise<ScaffoldConfig | null> {
  p.intro(pc.bgMagenta(pc.white(' Nuxt Project Scaffolder ')))

  const projectName = await p.text({
    message: 'What is your project name?',
    placeholder: `${basename(defaultPath)} (or "." for current directory)`,
    defaultValue: basename(defaultPath),
    validate: (value) => {
      if (!value) return 'Project name is required'
      if (value === '.') return // Allow "." for current directory
      if (!/^[a-z0-9-_]+$/i.test(value)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores (or "." for current directory)'
      }
    },
  })

  if (p.isCancel(projectName)) {
    p.cancel('Operation cancelled.')
    return null
  }

  const modules = await p.multiselect({
    message: 'Select additional community modules to install:',
    options: RECOMMENDED_MODULES.map((m) => ({
      value: m.value,
      label: m.label,
      hint: m.hint,
      disabled: m.disabled,
    })),
    required: false,
  })

  if (p.isCancel(modules)) {
    p.cancel('Operation cancelled.')
    return null
  }

  const storage = await p.multiselect({
    message: 'Select storage options for Docker Compose:',
    options: STORAGE_OPTIONS.map((s) => ({
      value: s.value,
      label: s.label,
      hint: s.hint,
    })),
    required: false,
  })

  if (p.isCancel(storage)) {
    p.cancel('Operation cancelled.')
    return null
  }

  let orm: OrmChoice = 'none'

  if ((storage as StorageOption[]).includes('postgres')) {
    const ormChoice = await p.select({
      message: 'Select an ORM for PostgreSQL:',
      options: ORM_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        hint: o.hint,
      })),
    })

    if (p.isCancel(ormChoice)) {
      p.cancel('Operation cancelled.')
      return null
    }

    orm = ormChoice as OrmChoice
  }

  const authChoice = await p.select({
    message: 'Select an authentication solution:',
    options: AUTH_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      hint: o.hint,
    })),
  })

  if (p.isCancel(authChoice)) {
    p.cancel('Operation cancelled.')
    return null
  }

  let emailService: EmailServiceChoice = 'none'

  if (authChoice === 'better-auth') {
    const emailChoice = await p.select({
      message: 'Select an email service for auth notifications:',
      options: EMAIL_SERVICE_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        hint: o.hint,
      })),
    })

    if (p.isCancel(emailChoice)) {
      p.cancel('Operation cancelled.')
      return null
    }

    emailService = emailChoice as EmailServiceChoice
  }

  const confirmed = await p.confirm({
    message: 'Ready to scaffold your project?',
    initialValue: true,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Operation cancelled.')
    return null
  }

  return {
    projectName: projectName as string,
    projectPath: defaultPath,
    modules: modules as NuxtModule[],
    storage: storage as StorageOption[],
    orm,
    auth: authChoice as AuthChoice,
    emailService,
    dryRun,
  }
}

export function printConfig(config: ScaffoldConfig): void {
  p.note(
    [
      `${pc.bold('Project:')} ${config.projectName}`,
      `${pc.bold('Path:')} ${config.projectPath}`,
      `${pc.bold('Modules:')} ${config.modules.length ? config.modules.join(', ') : 'None'}`,
      `${pc.bold('Storage:')} ${config.storage.length ? config.storage.join(', ') : 'None'}`,
      `${pc.bold('ORM:')} ${config.orm}`,
      `${pc.bold('Auth:')} ${config.auth}`,
      `${pc.bold('Email:')} ${config.emailService}`,
      config.dryRun ? pc.yellow('(Dry run - no changes will be made)') : '',
    ]
      .filter(Boolean)
      .join('\n'),
    'Configuration'
  )
}
