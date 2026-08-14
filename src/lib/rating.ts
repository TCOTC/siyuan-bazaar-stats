import type { PackageRating, PackageStats, RatingDistribution } from './types.ts'

export function buildPackageRating(distribution: RatingDistribution): PackageRating | undefined {
  let count = 0
  let weighted = 0
  for (let i = 0; i < 5; i++) {
    const itemCount = distribution[i]!
    if (itemCount < 0 || !Number.isSafeInteger(itemCount)) {
      return undefined
    }
    count += itemCount
    weighted += (i + 1) * itemCount
  }
  if (count < 1) {
    return undefined
  }
  return {
    average: weighted / count,
    count,
    distribution: [...distribution] as RatingDistribution,
  }
}

export function normalizePackageRating(rating: PackageRating | undefined): PackageRating | undefined {
  if (!rating || !Number.isFinite(rating.average)) {
    return undefined
  }
  if (!Array.isArray(rating.distribution) || rating.distribution.length !== 5) {
    return undefined
  }
  const distribution = rating.distribution.map((value) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      return NaN
    }
    return value
  }) as RatingDistribution
  if (distribution.some((value) => !Number.isSafeInteger(value))) {
    return undefined
  }
  const built = buildPackageRating(distribution)
  if (!built || rating.count !== built.count || Math.abs(rating.average - built.average) > 1e-9) {
    return undefined
  }
  return built
}

export function statsFromIndexPackage(downloads: number, rating: PackageRating | undefined): PackageStats {
  if (!rating) {
    return { d: downloads }
  }
  return {
    d: downloads,
    a: rating.average,
    c: rating.count,
    x: rating.distribution,
  }
}

export function ratingFromStats(stats: PackageStats): PackageRating | undefined {
  if (!stats.x) {
    return undefined
  }
  return buildPackageRating(stats.x)
}

/** 从快照字段还原均分和人数；忽略已持久化的 `a` / `c`。 */
export function hydrateStats(stats: PackageStats): PackageStats {
  const rating = stats.x ? buildPackageRating(stats.x) : undefined
  if (!rating || !stats.x) {
    return { d: stats.d }
  }
  return {
    d: stats.d,
    a: rating.average,
    c: rating.count,
    x: [...stats.x] as RatingDistribution,
  }
}

/** 快照只保留下载量和评分分布。 */
export function dehydrateStats(stats: PackageStats): PackageStats {
  return {
    d: stats.d,
    ...(stats.x ? { x: [...stats.x] as RatingDistribution } : {}),
  }
}

export function dehydratePackages(packages: Record<string, PackageStats>): Record<string, PackageStats> {
  const result: Record<string, PackageStats> = {}
  for (const [name, stats] of Object.entries(packages)) {
    result[name] = dehydrateStats(stats)
  }
  return result
}

export function statsEqual(left: PackageStats | undefined, right: PackageStats | undefined): boolean {
  if (left === right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  if (left.d !== right.d) {
    return false
  }
  if (!left.x && !right.x) {
    return true
  }
  if (!left.x || !right.x) {
    return false
  }
  return left.x.every((value, index) => value === right.x?.[index])
}

export function cloneStats(stats: PackageStats): PackageStats {
  return {
    d: stats.d,
    ...(stats.a !== undefined ? { a: stats.a } : {}),
    ...(stats.c !== undefined ? { c: stats.c } : {}),
    ...(stats.x ? { x: [...stats.x] as RatingDistribution } : {}),
  }
}
