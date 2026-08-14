import { isValidBazaarRepo, isValidPackageName } from './names.ts'
import { normalizePackageRating, statsFromIndexPackage } from './rating.ts'
import type { BazaarIndex, IndexPackage, PackageRating, RatingDistribution } from './types.ts'

type RawIndex = {
  meta?: {
    schema?: unknown
    ratingsAvailable?: unknown
    generation?: unknown
    publishedAt?: unknown
  }
  packages?: Record<string, {
    repo?: unknown
    downloads?: unknown
    rating?: {
      average?: unknown
      count?: unknown
      distribution?: unknown
    } | null
  } | null>
}

export function parseBazaarIndex(raw: unknown): BazaarIndex {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('invalid bazaar index')
  }
  const data = raw as RawIndex
  const meta = data.meta
  if (!meta || typeof meta !== 'object') {
    throw new Error('bazaar index meta is missing')
  }
  if (meta.schema !== 2) {
    throw new Error(`unsupported bazaar index schema: ${String(meta.schema)}`)
  }
  if (typeof meta.generation !== 'string' || meta.generation.trim() === '') {
    throw new Error('invalid bazaar index generation')
  }
  if (typeof meta.publishedAt !== 'number' || !Number.isSafeInteger(meta.publishedAt) || meta.publishedAt < 1) {
    throw new Error('invalid bazaar index publishedAt')
  }
  if (typeof meta.ratingsAvailable !== 'boolean') {
    throw new Error('invalid bazaar index ratingsAvailable')
  }
  if (!data.packages || typeof data.packages !== 'object' || Array.isArray(data.packages)) {
    throw new Error('bazaar index packages are missing')
  }

  const packages: Record<string, IndexPackage> = {}
  for (const [packageName, pkg] of Object.entries(data.packages)) {
    if (!isValidPackageName(packageName) || !pkg || typeof pkg !== 'object') {
      continue
    }
    if (typeof pkg.repo !== 'string' || !isValidBazaarRepo(pkg.repo)) {
      continue
    }
    if (typeof pkg.downloads !== 'number' || !Number.isSafeInteger(pkg.downloads) || pkg.downloads < 0) {
      continue
    }
    const parsed: IndexPackage = {
      repo: pkg.repo,
      downloads: pkg.downloads,
    }
    if (pkg.rating) {
      const rating = parseRawRating(pkg.rating)
      if (rating) {
        parsed.rating = rating
      }
    }
    packages[packageName] = parsed
  }

  return {
    schema: 2,
    ratingsAvailable: meta.ratingsAvailable,
    generation: meta.generation,
    publishedAt: meta.publishedAt,
    packages,
  }
}

function parseRawRating(raw: {
  average?: unknown
  count?: unknown
  distribution?: unknown
}): PackageRating | undefined {
  if (typeof raw.average !== 'number' || typeof raw.count !== 'number' || !Array.isArray(raw.distribution)) {
    return undefined
  }
  if (raw.distribution.length !== 5 || raw.distribution.some((value) => typeof value !== 'number')) {
    return undefined
  }
  return normalizePackageRating({
    average: raw.average,
    count: raw.count,
    distribution: raw.distribution as RatingDistribution,
  })
}

export function indexToStats(index: BazaarIndex): Record<string, ReturnType<typeof statsFromIndexPackage>> {
  const stats: Record<string, ReturnType<typeof statsFromIndexPackage>> = {}
  for (const [name, pkg] of Object.entries(index.packages)) {
    stats[name] = statsFromIndexPackage(pkg.downloads, pkg.rating)
  }
  return stats
}
