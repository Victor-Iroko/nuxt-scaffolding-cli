import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { bunInstall, writeFile, ensureDir, addScriptsToPackageJson, logger } from '../utils'

export async function installTestUtils(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Installing @nuxt/test-utils...')

  const installed = await bunInstall(
    ['@nuxt/test-utils', 'vitest', '@vue/test-utils', 'happy-dom'],
    {
      cwd: config.projectPath,
      dev: true,
      dryRun: config.dryRun,
    }
  )

  if (!installed && !config.dryRun) {
    logger.error('Failed to install @nuxt/test-utils')
    return false
  }

  const vitestConfig = `import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
  },
})
`

  writeFile(join(config.projectPath, 'vitest.config.ts'), vitestConfig, {
    dryRun: config.dryRun,
  })

  ensureDir(join(config.projectPath, 'tests', 'unit'), { dryRun: config.dryRun })
  ensureDir(join(config.projectPath, 'tests', 'e2e'), { dryRun: config.dryRun })
  ensureDir(join(config.projectPath, 'tests', 'nuxt'), { dryRun: config.dryRun })

  const exampleTest = `import { describe, it, expect } from 'vitest'

describe('Example', () => {
  it('should pass', () => {
    expect(true).toBe(true)
  })
})
`

  writeFile(join(config.projectPath, 'tests', 'unit', 'example.test.ts'), exampleTest, {
    dryRun: config.dryRun,
  })

  addScriptsToPackageJson(
    config.projectPath,
    {
      test: 'vitest --passWithNoTests',
      'test:unit': 'vitest --project unit',
      'test:nuxt': 'vitest --project nuxt',
      'test:watch': 'vitest --watch',
      'test:related': 'vitest related --run',
    },
    { dryRun: config.dryRun }
  )

  logger.success('@nuxt/test-utils installed')
  return true
}

export const TEST_UTILS_CONFIG = {
  module: '@nuxt/test-utils/module',
}
