export const PACKAGE_TYPES = ['plugins', 'themes', 'widgets', 'icons', 'templates'] as const

export type PackageType = (typeof PACKAGE_TYPES)[number]

export type RatingDistribution = [number, number, number, number, number]

export type PackageRating = {
  average: number
  count: number
  distribution: RatingDistribution
}

export type IndexPackage = {
  repo: string
  downloads: number
  rating?: PackageRating
}

export type BazaarIndex = {
  schema: number
  ratingsAvailable: boolean
  generation: string
  publishedAt: number
  packages: Record<string, IndexPackage>
}

/** 单个包在某一时刻的完整统计。无 `c` 或 `c` 为 0 表示当时没有公开评分。 */
export type PackageStats = {
  d: number
  a?: number
  c?: number
  x?: RatingDistribution
}

export type SnapshotFile = {
  t: number
  g: string
  full?: boolean
  p: Record<string, PackageStats>
}

export type CollectorState = {
  generation: string
  publishedAt: number
  fetchedAt: number
  lastFullAt: number
  packages: Record<string, PackageStats>
}

export type LocaleStrings = Record<string, string>

export type CatalogPackage = {
  type: PackageType
  repo: string
  repoHash?: string
  author: string
  displayName: LocaleStrings
  description: LocaleStrings
}

export type Catalog = {
  updatedAt: number
  packages: Record<string, CatalogPackage>
}

export type SummaryPackage = {
  name: string
  type?: PackageType
  repo: string
  author: string
  displayName: string
  description: string
  iconURL?: string
  downloads: number
  rating?: PackageRating
  downloadDelta24h: number
  ratingCountDelta24h: number
  sparklineDownloads: number[]
  sparklineAverage: number[]
}

export type SiteSummary = {
  updatedAt: number
  publishedAt: number
  generation: string
  totals: {
    packages: number
    rated: number
    ratings: number
    downloads: number
  }
  packages: SummaryPackage[]
}

export type PackageHistoryPoint = {
  t: number
} & PackageStats

export type PackageDetail = {
  name: string
  type?: PackageType
  repo: string
  author: string
  displayName: string
  description: string
  iconURL?: string
  current: PackageStats
  history: PackageHistoryPoint[]
}
