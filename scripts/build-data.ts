import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unescapeHtml } from '../src/lib/locale.ts'
import { catalogDescription, catalogDisplayName, catalogIconURL } from '../src/lib/catalog-view.ts'
import { bazaarIndexURL } from '../src/lib/constants.ts'
import { overlayCurrentStats, reconstructHistories } from '../src/lib/history.ts'
import { parseBazaarIndex, indexToStats } from '../src/lib/parse-index.ts'
import { cloneStats, ratingFromStats } from '../src/lib/rating.ts'
import { DATA_SCHEMA } from '../src/lib/types.ts'
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
import { readIndexCache } from './index-cache.ts'
import { fetchJSON, loadSnapshots, writeJson } from './io.ts'

const DAY = 24 * 60 * 60
const SPARKLINE_POINTS = 48

export async function buildSiteData(): Promise<void> {
  const now = Date.now()
  const snapshots = await loadSnapshots()
  // 集市索引是「哪些包在架」的唯一依据：产物只包含索引里的包，已下架的包不进产物。
  // 取不到索引就无法确定在架集合，因此直接失败让工作流报红，由 GitHub 通知维护者，
  // 而不是静默降级出一份无法判断在架状态的产物。
  const index = await loadLiveIndex(now)
  const catalog = await loadCatalogSafe(Math.floor(now / 1000))

  const currentStats = indexToStats(index)
  const histories = overlayCurrentStats(reconstructHistories(snapshots), currentStats, index.publishedAt)
  const publishedAt = index.publishedAt
  const generation = index.generation
  const updatedAt = Math.floor(now / 1000)

  const packages = Object.entries(currentStats)
    .map(([name, stats]) => toSummary(name, stats, catalog, index.packages[name]!.repo, histories[name] ?? [], publishedAt))
    .sort(compareSummary)

  const summary: SiteSummary = {
    schema: DATA_SCHEMA,
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
    const detail: PackageDetail = {
      schema: DATA_SCHEMA,
      name: pkg.name,
      type: pkg.type,
      repo: pkg.repo,
      author: pkg.author,
      displayName: pkg.displayName,
      description: pkg.description,
      ...(pkg.iconURL ? { iconURL: pkg.iconURL } : {}),
      ...(pkg.updatedAt ? { updatedAt: pkg.updatedAt } : {}),
      current: cloneStats(currentStats[pkg.name]!),
      history: histories[pkg.name] ?? [],
    }
    await writeJson(path.join(publicData, 'packages', `${pkg.name}.json`), detail)
  }
  console.log(`built site data: ${packages.length} packages, ${snapshots.length} snapshots`)
}

async function loadLiveIndex(now: number): Promise<BazaarIndex> {
  // 同一次工作流里 collect 已经请求过索引，优先复用它，保证两步看到的是同一份数据。
  const cached = await readIndexCache()
  if (cached) {
    console.log('using bazaar index cached by collect')
    return cached
  }
  const url = bazaarIndexURL(now)
  try {
    return parseBazaarIndex(await fetchJSON(url))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`集市索引不可用，无法确定在架包集合：GET ${url} -> ${reason}`)
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

function toSummary(
  name: string,
  stats: PackageStats,
  catalog: Catalog | undefined,
  repo: string,
  history: PackageHistoryPoint[],
  publishedAt: number,
): SummaryPackage {
  const meta = catalog?.packages[name]
  const baseline = pointAtOrBefore(history, publishedAt - DAY) ?? history[0]
  const rating = ratingFromStats(stats)
  const iconURL = catalogIconURL(meta)
  return {
    name,
    type: meta?.type,
    repo,
    author: unescapeHtml(meta?.author ?? ''),
    displayName: catalogDisplayName(meta, name),
    description: catalogDescription(meta),
    ...(iconURL ? { iconURL } : {}),
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
