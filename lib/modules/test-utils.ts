import { join } from 'path'
import type { ScaffoldConfig } from '../types'
import { writeFile, ensureDir, addScriptsToPackageJson, logger } from '../utils'

export const TEST_UTILS_PACKAGES = {
  devDeps: ['@nuxt/test-utils', 'vitest', '@vue/test-utils', 'happy-dom'],
}

export async function setupTestUtils(config: ScaffoldConfig): Promise<boolean> {
  logger.step('Setting up @nuxt/test-utils...')

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

  logger.success('@nuxt/test-utils configured')
  return true
}

export const TEST_UTILS_CONFIG = {
  module: '@nuxt/test-utils/module',
}
