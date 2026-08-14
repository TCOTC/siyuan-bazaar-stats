import { cloneStats, hydrateStats, statsEqual } from './rating.ts'
import type { PackageHistoryPoint, PackageStats, SnapshotFile } from './types.ts'

export function diffStats(
  previous: Record<string, PackageStats>,
  next: Record<string, PackageStats>,
): Record<string, PackageStats> {
  const changes: Record<string, PackageStats> = {}
  for (const [name, stats] of Object.entries(next)) {
    if (!statsEqual(previous[name], stats)) {
      changes[name] = cloneStats(stats)
    }
  }
  for (const name of Object.keys(previous)) {
    if (!(name in next)) {
      // 索引中消失的包保留最后一次统计，不写入“删除”点。
    }
  }
  return changes
}

export function applySnapshot(
  current: Record<string, PackageStats>,
  snapshot: SnapshotFile,
): Record<string, PackageStats> {
  const next = snapshot.full ? {} : { ...current }
  for (const [name, stats] of Object.entries(snapshot.p)) {
    next[name] = hydrateStats(stats)
  }
  return next
}

export function replayPackages(snapshots: SnapshotFile[]): Record<string, PackageStats> {
  let current: Record<string, PackageStats> = {}
  for (const snapshot of snapshots) {
    current = applySnapshot(current, snapshot)
  }
  return current
}

export function lastFullTimestamp(snapshots: SnapshotFile[]): number | undefined {
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const snapshot = snapshots[i]
    if (snapshot?.full) {
      return snapshot.t
    }
  }
  return undefined
}

/** 把当前索引叠进历史：只追加有变化的点，不写回仓库。 */
export function overlayCurrentStats(
  histories: Record<string, PackageHistoryPoint[]>,
  live: Record<string, PackageStats>,
  publishedAt: number,
): Record<string, PackageHistoryPoint[]> {
  const result: Record<string, PackageHistoryPoint[]> = { ...histories }
  for (const [name, stats] of Object.entries(live)) {
    const hydrated = hydrateStats(stats)
    const points = result[name] ? [...result[name]!] : []
    const last = points.at(-1)
    if (last && last.t === publishedAt) {
      points[points.length - 1] = { t: publishedAt, ...cloneStats(hydrated) }
    } else if (!last || !statsEqual(last, hydrated)) {
      points.push({ t: publishedAt, ...cloneStats(hydrated) })
    }
    result[name] = points
  }
  return result
}

/** 只给快照里出现过的包追加历史点，避免未变化的包被重复铺平。 */
export function reconstructHistories(snapshots: SnapshotFile[]): Record<string, PackageHistoryPoint[]> {
  let current: Record<string, PackageStats> = {}
  const histories: Record<string, PackageHistoryPoint[]> = {}
  for (const snapshot of snapshots) {
    current = applySnapshot(current, snapshot)
    for (const name of Object.keys(snapshot.p)) {
      const stats = current[name]
      if (!stats) {
        continue
      }
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

export function utcDay(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export function utcMonth(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 7)
}

export function shouldWriteFullSnapshot(lastFullAt: number | undefined, publishedAt: number): boolean {
  if (lastFullAt === undefined) {
    return true
  }
  return utcDay(lastFullAt) !== utcDay(publishedAt)
}
