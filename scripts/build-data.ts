import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unescapeHtml } from '../src/lib/locale.ts'
import { catalogDescription, catalogDisplayName, catalogIconURL } from '../src/lib/catalog-view.ts'
import { bazaarIndexURL } from '../src/lib/constants.ts'
import { overlayCurrentStats, reconstructHistories, replayPackages } from '../src/lib/history.ts'
import { parseBazaarIndex, indexToStats } from '../src/lib/parse-index.ts'
import { cloneStats, ratingFromStats } from '../src/lib/rating.ts'
import type {
  BazaarIndex,
  Catalog,
  PackageDetail,
  PackageHistoryPoint,
  PackageStats,
  SiteSummary,
  SummaryPackage,
} from '../src/lib/types.ts'
import { loadCatalog } from './catalog.ts'
import { fetchJSON, loadSnapshots, writeJson } from './io.ts'

const DAY = 24 * 60 * 60
const SPARKLINE_POINTS = 48

export async function buildSiteData(): Promise<void> {
  const now = Date.now()
  const snapshots = await loadSnapshots()
  let histories = reconstructHistories(snapshots)
  const catalog = await loadCatalogSafe(Math.floor(now / 1000))
  const index = await loadLiveIndex(now)

  let publishedAt = snapshots.at(-1)?.t ?? lastTimestamp(histories)
  let generation = snapshots.at(-1)?.g ?? ''
  let updatedAt = publishedAt
  let currentStats: Record<string, PackageStats>

  if (index) {
    const live = indexToStats(index)
    histories = overlayCurrentStats(histories, live, index.publishedAt)
    currentStats = live
    publishedAt = index.publishedAt
    generation = index.generation
    updatedAt = Math.floor(now / 1000)
  } else {
    currentStats = replayPackages(snapshots)
  }

  const packages = Object.entries(currentStats)
    .map(([name, stats]) => toSummary(name, stats, catalog, histories[name] ?? [], publishedAt))
    .sort(compareSummary)

  const summary: SiteSummary = {
    updatedAt,
    publishedAt,
    generation,
    totals: {
      packages: packages.length,
      rated: packages.filter((pkg) => pkg.rating).length,
      ratings: packages.reduce((sum, pkg) => sum + (pkg.rating?.count ?? 0), 0),
      downloads: packages.reduce((sum, pkg) => sum + pkg.downloads, 0),
    },
    packages,
  }

  const publicData = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data')
  await rm(path.join(publicData, 'packages'), { recursive: true, force: true })
  await writeJson(path.join(publicData, 'summary.json'), summary)
  for (const pkg of packages) {
    const current = currentStats[pkg.name]
    const detail: PackageDetail = {
      name: pkg.name,
      type: pkg.type,
      repo: pkg.repo,
      author: pkg.author,
      displayName: pkg.displayName,
      description: pkg.description,
      ...(pkg.iconURL ? { iconURL: pkg.iconURL } : {}),
      ...(pkg.updatedAt ? { updatedAt: pkg.updatedAt } : {}),
      current: current ? cloneStats(current) : { d: pkg.downloads },
      history: histories[pkg.name] ?? [],
    }
    await writeJson(path.join(publicData, 'packages', `${pkg.name}.json`), detail)
  }
  console.log(`built site data: ${packages.length} packages, ${snapshots.length} snapshots`)
}

async function loadLiveIndex(now: number): Promise<BazaarIndex | undefined> {
  try {
    return parseBazaarIndex(await fetchJSON(bazaarIndexURL(now)))
  } catch (error) {
    console.warn('fetch bazaar index failed:', error)
    return undefined
  }
}

async function loadCatalogSafe(now: number): Promise<Catalog | undefined> {
  try {
    return await loadCatalog(now, undefined)
  } catch (error) {
    console.warn('fetch catalog failed:', error)
    return undefined
  }
}

function lastTimestamp(histories: Record<string, PackageHistoryPoint[]>): number {
  let latest = 0
  for (const points of Object.values(histories)) {
    const last = points.at(-1)
    if (last && last.t > latest) {
      latest = last.t
    }
  }
  return latest
}

function toSummary(
  name: string,
  stats: PackageStats,
  catalog: Catalog | undefined,
  history: PackageHistoryPoint[],
  publishedAt: number,
): SummaryPackage {
  const meta = catalog?.packages[name]
  const baseline = pointAtOrBefore(history, publishedAt - DAY) ?? history[0]
  const rating = ratingFromStats(stats)
  return {
    name,
    type: meta?.type,
    repo: meta?.repo ?? '',
    author: unescapeHtml(meta?.author ?? ''),
    displayName: catalogDisplayName(meta, name),
    description: catalogDescription(meta),
    ...(catalogIconURL(meta) ? { iconURL: catalogIconURL(meta) } : {}),
    downloads: stats.d,
    ...(rating ? { rating } : {}),
    downloadDelta24h: stats.d - (baseline?.d ?? stats.d),
    ratingCountDelta24h: (rating?.count ?? 0) - (baseline ? ratingFromStats(baseline)?.count ?? 0 : rating?.count ?? 0),
    sparklineDownloads: sparkline(history, (point) => point.d),
    sparklineAverage: sparkline(history.filter((point) => point.a !== undefined), (point) => point.a ?? 0),
    updatedAt: meta?.updatedAt ?? 0,
  }
}

function pointAtOrBefore(history: PackageHistoryPoint[], timestamp: number): PackageHistoryPoint | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const point = history[i]
    if (point && point.t <= timestamp) {
      return point
    }
  }
  return undefined
}

function sparkline(history: PackageHistoryPoint[], value: (point: PackageHistoryPoint) => number): number[] {
  if (history.length === 0) {
    return []
  }
  if (history.length <= SPARKLINE_POINTS) {
    return history.map(value)
  }
  const result: number[] = []
  const last = history.length - 1
  for (let i = 0; i < SPARKLINE_POINTS; i++) {
    const index = Math.round(i * last / (SPARKLINE_POINTS - 1))
    result.push(value(history[index]!))
  }
  return result
}

function compareSummary(left: SummaryPackage, right: SummaryPackage): number {
  if (left.updatedAt === 0 && right.updatedAt === 0) {
    return right.downloads - left.downloads
  }
  if (left.updatedAt === 0) {
    return 1
  }
  if (right.updatedAt === 0) {
    return -1
  }
  return right.updatedAt - left.updatedAt || right.downloads - left.downloads
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSiteData().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
