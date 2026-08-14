import { unescapeHtml } from '../src/lib/locale.ts'
import { BAZAAR_STAGE_BASE, USER_AGENT } from '../src/lib/constants.ts'
import { utcDay } from '../src/lib/history.ts'
import { isValidBazaarRepo, isValidPackageName } from '../src/lib/names.ts'
import { PACKAGE_TYPES, type Catalog, type CatalogPackage, type LocaleStrings, type PackageType } from '../src/lib/types.ts'

type StageRepo = {
  url?: unknown
  package?: {
    name?: unknown
    author?: unknown
    displayName?: unknown
    description?: unknown
  } | null
}

type StageIndex = {
  repos?: StageRepo[] | null
}

export async function loadCatalog(
  now: number,
  previous: Catalog | undefined,
  packageNames: string[],
): Promise<Catalog> {
  const missing = packageNames.some((name) => !previous?.packages[name])
  const stale = !previous || utcDay(previous.updatedAt) !== utcDay(now)
  if (previous && !missing && !stale) {
    return previous
  }

  const packages: Record<string, CatalogPackage> = { ...(previous?.packages ?? {}) }
  let failed = 0
  for (const type of PACKAGE_TYPES) {
    try {
      mergeStage(packages, type, await fetchStage(type))
    } catch (error) {
      failed += 1
      console.warn(`fetch stage ${type} failed:`, error)
    }
  }
  if (failed === PACKAGE_TYPES.length && previous) {
    return previous
  }
  return {
    updatedAt: now,
    packages,
  }
}

async function fetchStage(type: PackageType): Promise<StageIndex> {
  const response = await fetch(`${BAZAAR_STAGE_BASE}/${type}.json`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`stage ${type} HTTP ${response.status}`)
  }
  return await response.json() as StageIndex
}

function mergeStage(
  packages: Record<string, CatalogPackage>,
  type: PackageType,
  stage: StageIndex,
): void {
  if (!Array.isArray(stage.repos)) {
    return
  }
  for (const repo of stage.repos) {
    const pkg = repo.package
    if (!pkg || typeof pkg.name !== 'string' || !isValidPackageName(pkg.name)) {
      continue
    }
    const repoHash = typeof repo.url === 'string' ? repo.url : undefined
    const repoName = repoHash?.split('@')[0]
    if (!repoName || !isValidBazaarRepo(repoName)) {
      continue
    }
    packages[pkg.name] = {
      type,
      repo: repoName,
      ...(repoHash ? { repoHash } : {}),
      author: typeof pkg.author === 'string' ? unescapeHtml(pkg.author) : '',
      displayName: asLocaleStrings(pkg.displayName),
      description: asLocaleStrings(pkg.description),
    }
  }
}

function asLocaleStrings(value: unknown): LocaleStrings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const result: LocaleStrings = {}
  for (const [key, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text === 'string' && text.trim()) {
      result[key] = unescapeHtml(text)
    }
  }
  return result
}
