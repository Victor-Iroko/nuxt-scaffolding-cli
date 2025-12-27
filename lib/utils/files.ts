import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { logger } from './logger'

export interface FileOptions {
  dryRun?: boolean
}

export function writeFile(
  filePath: string,
  content: string,
  options: FileOptions = {}
): boolean {
  const { dryRun = false } = options

  if (dryRun) {
    logger.step(`Would create: ${filePath}`)
    return true
  }

  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(filePath, content, 'utf-8')
    logger.success(`Created: ${filePath}`)
    return true
  } catch (error) {
    logger.error(`Failed to create: ${filePath}`)
    return false
  }
}

export function readFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}

export function ensureDir(dirPath: string, options: FileOptions = {}): boolean {
  const { dryRun = false } = options

  if (dryRun) {
    logger.step(`Would create directory: ${dirPath}`)
    return true
  }

  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true })
      logger.success(`Created directory: ${dirPath}`)
    }
    return true
  } catch {
    logger.error(`Failed to create directory: ${dirPath}`)
    return false
  }
}

export function readJsonFile<T>(filePath: string): T | null {
  const content = readFile(filePath)
  if (!content) return null
  try {
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export function writeJsonFile(
  filePath: string,
  data: unknown,
  options: FileOptions = {}
): boolean {
  const content = JSON.stringify(data, null, 2)
  return writeFile(filePath, content, options)
}

export function updatePackageJson(
  projectPath: string,
  updater: (pkg: Record<string, unknown>) => Record<string, unknown>,
  options: FileOptions = {}
): boolean {
  const pkgPath = join(projectPath, 'package.json')
  const pkg = readJsonFile<Record<string, unknown>>(pkgPath)

  if (!pkg) {
    logger.error('Could not read package.json')
    return false
  }

  const updatedPkg = updater(pkg)
  return writeJsonFile(pkgPath, updatedPkg, options)
}

export function addScriptsToPackageJson(
  projectPath: string,
  scripts: Record<string, string>,
  options: FileOptions = {}
): boolean {
  return updatePackageJson(
    projectPath,
    (pkg) => {
      const existingScripts = (pkg.scripts as Record<string, string>) || {}
      return {
        ...pkg,
        scripts: { ...existingScripts, ...scripts },
      }
    },
    options
  )
}
