import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { exec, writeFile, addScriptsToPackageJson, logger } from '../utils'

export async function installEslint(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @nuxt/eslint...')

  const result = await exec('npx nuxi module add eslint', {
    cwd: config.projectPath,
    dryRun: config.dryRun,
  })

  if (!result.success && !config.dryRun) {
    logger.error('Failed to install @nuxt/eslint')
    return false
  }

  const eslintConfig = `import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'no-console': 'warn',
  },
})
`

  writeFile(join(config.projectPath, 'eslint.config.mjs'), eslintConfig, {
    dryRun: config.dryRun,
  })

  addScriptsToPackageJson(
    config.projectPath,
    {
      lint: 'eslint .',
      'lint:fix': 'eslint . --fix',
    },
    { dryRun: config.dryRun }
  )

  logger.success('@nuxt/eslint installed')
  return true
}

export const ESLINT_CONFIG = {
  module: '@nuxt/eslint',
}
