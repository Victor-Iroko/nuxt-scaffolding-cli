import * as p from '@clack/prompts'
import { basename } from 'path'
import pc from 'picocolors'
import {
  type ScaffoldConfig,
  type NuxtModule,
  type OptionalModule,
  type StorageOption,
  type OrmChoice,
  RECOMMENDED_MODULES,
  OPTIONAL_MODULES,
  STORAGE_OPTIONS,
  ORM_OPTIONS,
} from './types'

export async function runPrompts(defaultPath: string, dryRun: boolean): Promise<ScaffoldConfig | null> {
  p.intro(pc.bgMagenta(pc.white(' Nuxt Project Scaffolder ')))

  const projectName = await p.text({
    message: 'What is your project name?',
    placeholder: basename(defaultPath),
    defaultValue: basename(defaultPath),
    validate: (value) => {
      if (!value) return 'Project name is required'
      if (!/^[a-z0-9-_]+$/i.test(value)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores'
      }
    },
  })

  if (p.isCancel(projectName)) {
    p.cancel('Operation cancelled.')
    return null
  }

  const modules = await p.multiselect({
    message: 'Select recommended modules to install:',
    options: RECOMMENDED_MODULES.map((m) => ({
      value: m.value,
      label: m.label,
      hint: m.hint,
    })),
    required: false,
  })

  if (p.isCancel(modules)) {
    p.cancel('Operation cancelled.')
    return null
  }

  const optionalModules = await p.multiselect({
    message: 'Select optional modules:',
    options: OPTIONAL_MODULES.map((m) => ({
      value: m.value,
      label: m.label,
      hint: m.hint,
    })),
    required: false,
  })

  if (p.isCancel(optionalModules)) {
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
    optionalModules: optionalModules as OptionalModule[],
    storage: storage as StorageOption[],
    orm,
    dryRun,
  }
}

export function printConfig(config: ScaffoldConfig): void {
  p.note(
    [
      `${pc.bold('Project:')} ${config.projectName}`,
      `${pc.bold('Path:')} ${config.projectPath}`,
      `${pc.bold('Modules:')} ${config.modules.length ? config.modules.join(', ') : 'None'}`,
      `${pc.bold('Optional:')} ${config.optionalModules.length ? config.optionalModules.join(', ') : 'None'}`,
      `${pc.bold('Storage:')} ${config.storage.length ? config.storage.join(', ') : 'None'}`,
      `${pc.bold('ORM:')} ${config.orm}`,
      config.dryRun ? pc.yellow('(Dry run - no changes will be made)') : '',
    ]
      .filter(Boolean)
      .join('\n'),
    'Configuration'
  )
}
