import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unescapeHtml } from '../src/lib/locale.ts'
import { catalogDescription, catalogDisplayName, catalogIconURL } from '../src/lib/catalog-view.ts'
import { applySnapshot } from '../src/lib/history.ts'
import { cloneStats, ratingFromStats } from '../src/lib/rating.ts'
import type {
  Catalog,
  CollectorState,
  PackageDetail,
  PackageHistoryPoint,
  PackageStats,
  SiteSummary,
  SnapshotFile,
  SummaryPackage,
} from '../src/lib/types.ts'
import { DATA_DIR, listFiles, readJson, readJsonl, writeJson } from './io.ts'

const DAY = 24 * 60 * 60
const SPARKLINE_POINTS = 48

export async function buildSiteData(): Promise<void> {
  const state = await readJson<CollectorState>(path.join(DATA_DIR, 'state.json'))
  const catalog = await readJson<Catalog>(path.join(DATA_DIR, 'catalog.json'))
  const snapshots = await loadSnapshots()
  const histories = reconstructHistories(snapshots)
  const publishedAt = state?.publishedAt ?? lastTimestamp(histories)
  const packages = Object.entries(state?.packages ?? lastStats(histories))
    .map(([name, stats]) => toSummary(name, stats, catalog, histories[name] ?? [], publishedAt))
    .sort(compareSummary)

  const summary: SiteSummary = {
    updatedAt: state?.fetchedAt ?? publishedAt,
    publishedAt,
    generation: state?.generation ?? '',
    totals: {
      packages: packages.length,
      rated: packages.filter((pkg) => pkg.rating).length,
      ratings: packages.reduce((sum, pkg) => sum + (pkg.rating?.count ?? 0), 0),
      downloads: packages.reduce((sum, pkg) => sum + pkg.downloads, 0),
    },
    packages,
  }

  const publicData = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data')
  await writeJson(path.join(publicData, 'summary.json'), summary)
  for (const pkg of packages) {
    const last = histories[pkg.name]?.at(-1)
    const detail: PackageDetail = {
      name: pkg.name,
      type: pkg.type,
      repo: pkg.repo,
      author: pkg.author,
      displayName: pkg.displayName,
      description: pkg.description,
      ...(pkg.iconURL ? { iconURL: pkg.iconURL } : {}),
      current: last ? cloneStats(last) : { d: pkg.downloads },
      history: histories[pkg.name] ?? [],
    }
    await writeJson(path.join(publicData, 'packages', `${pkg.name}.json`), detail)
  }
  console.log(`built site data: ${packages.length} packages, ${snapshots.length} snapshots`)
}

async function loadSnapshots(): Promise<SnapshotFile[]> {
  const dir = path.join(DATA_DIR, 'snapshots')
  const files = await listFiles(dir, '.jsonl')
  const snapshots: SnapshotFile[] = []
  for (const file of files) {
    snapshots.push(...await readJsonl<SnapshotFile>(path.join(dir, file)))
  }
  return snapshots.sort((left, right) => left.t - right.t || left.g.localeCompare(right.g))
}

function reconstructHistories(snapshots: SnapshotFile[]): Record<string, PackageHistoryPoint[]> {
  let current: Record<string, PackageStats> = {}
  const histories: Record<string, PackageHistoryPoint[]> = {}
  for (const snapshot of snapshots) {
    current = applySnapshot(current, snapshot)
    for (const [name, stats] of Object.entries(current)) {
      const points = histories[name] ?? []
      const last = points.at(-1)
      if (last && last.t === snapshot.t) {
        points[points.length - 1] = { t: snapshot.t, ...cloneStats(stats) }
      } else {
        points.push({ t: snapshot.t, ...cloneStats(stats) })
      }
      histories[name] = points
    }
  }
  return histories
}

function lastStats(histories: Record<string, PackageHistoryPoint[]>): Record<string, PackageStats> {
  const stats: Record<string, PackageStats> = {}
  for (const [name, points] of Object.entries(histories)) {
    const last = points.at(-1)
    if (last) {
      stats[name] = last
    }
  }
  return stats
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
    ratingCountDelta24h: (stats.c ?? 0) - (baseline?.c ?? stats.c ?? 0),
    sparklineDownloads: sparkline(history, (point) => point.d),
    sparklineAverage: sparkline(history, (point) => point.a ?? 0),
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
  const rightCount = right.rating?.count ?? 0
  const leftCount = left.rating?.count ?? 0
  if (rightCount !== leftCount) {
    return rightCount - leftCount
  }
  const rightAvg = right.rating?.average ?? 0
  const leftAvg = left.rating?.average ?? 0
  if (rightAvg !== leftAvg) {
    return rightAvg - leftAvg
  }
  return right.downloads - left.downloads
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSiteData().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
