import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, addScriptsToPackageJson, logger } from '../utils'

export async function setupEslint(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up @nuxt/eslint...')

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

  logger.success('@nuxt/eslint configured')
  return true
}

export const ESLINT_CONFIG = {
  module: '@nuxt/eslint',
}
