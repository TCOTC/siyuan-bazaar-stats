import { cloneStats, statsEqual } from './rating.ts'
import type { CollectorState, PackageStats, SnapshotFile } from './types.ts'

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
    next[name] = cloneStats(stats)
  }
  return next
}

export function utcDay(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export function utcMonth(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 7)
}

export function shouldWriteFullSnapshot(state: CollectorState | undefined, publishedAt: number): boolean {
  if (!state) {
    return true
  }
  return utcDay(state.lastFullAt) !== utcDay(publishedAt)
}
