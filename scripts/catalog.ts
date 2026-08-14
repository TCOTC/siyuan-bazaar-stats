import { unescapeHtml } from '../src/lib/locale.ts'
import { parseBazaarHash, parseStageUpdated } from '../src/lib/catalog-view.ts'
import { bazaarStageURL, RHY_VERSION_URL, USER_AGENT } from '../src/lib/constants.ts'
import { isValidBazaarRepo, isValidPackageName } from '../src/lib/names.ts'
import { PACKAGE_TYPES, type Catalog, type CatalogPackage, type LocaleStrings, type PackageType } from '../src/lib/types.ts'

type StageRepo = {
  url?: unknown
  updated?: unknown
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
): Promise<Catalog> {
  let hash: string
  try {
    hash = await fetchBazaarHash()
  } catch (error) {
    console.warn('fetch bazaar hash failed:', error)
    if (previous) {
      return previous
    }
    throw error
  }

  const packages: Record<string, CatalogPackage> = { ...(previous?.packages ?? {}) }
  let failed = 0
  for (const type of PACKAGE_TYPES) {
    try {
      mergeStage(packages, type, await fetchStageJSON(bazaarStageURL(hash, type)))
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

async function fetchBazaarHash(): Promise<string> {
  const response = await fetch(RHY_VERSION_URL, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`rhy version HTTP ${response.status}`)
  }
  return parseBazaarHash(await response.json())
}

async function fetchStageJSON(url: string): Promise<StageIndex> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`stage ${url} HTTP ${response.status}`)
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
    const updatedAt = parseStageUpdated(repo.updated)
    packages[pkg.name] = {
      type,
      repo: repoName,
      ...(repoHash ? { repoHash } : {}),
      author: typeof pkg.author === 'string' ? unescapeHtml(pkg.author) : '',
      displayName: asLocaleStrings(pkg.displayName),
      description: asLocaleStrings(pkg.description),
      ...(updatedAt ? { updatedAt } : {}),
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
