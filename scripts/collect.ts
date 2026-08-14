import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bazaarIndexURL } from '../src/lib/constants.ts'
import { diffStats, lastFullTimestamp, replayPackages, shouldWriteFullSnapshot, utcMonth } from '../src/lib/history.ts'
import { parseBazaarIndex, indexToStats } from '../src/lib/parse-index.ts'
import { dehydratePackages } from '../src/lib/rating.ts'
import type { SnapshotFile } from '../src/lib/types.ts'
import { DATA_DIR, fetchJSON, loadSnapshots } from './io.ts'

export async function collect(now = Date.now()): Promise<{ changed: boolean, snapshot?: SnapshotFile }> {
  const index = parseBazaarIndex(await fetchJSON(bazaarIndexURL(now)))
  const nextStats = indexToStats(index)
  const snapshots = await loadSnapshots()
  const previous = replayPackages(snapshots)
  const full = shouldWriteFullSnapshot(lastFullTimestamp(snapshots), index.publishedAt)
  const changes = full ? nextStats : diffStats(previous, nextStats)

  if (Object.keys(changes).length === 0) {
    console.log('no bazaar stats changes')
    return { changed: false }
  }

  const snapshot: SnapshotFile = {
    t: index.publishedAt,
    g: index.generation,
    ...(full ? { full: true } : {}),
    p: dehydratePackages(changes),
  }
  await mkdir(path.join(DATA_DIR, 'snapshots'), { recursive: true })
  await appendJsonl(path.join(DATA_DIR, 'snapshots', `${utcMonth(index.publishedAt)}.jsonl`), snapshot)
  console.log(`wrote ${full ? 'full' : 'delta'} snapshot: ${Object.keys(changes).length} packages`)
  return { changed: true, snapshot }
}

async function appendJsonl(filePath: string, value: SnapshotFile): Promise<void> {
  const line = `${JSON.stringify(value)}\n`
  await writeFile(filePath, line, { flag: 'a' })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  collect().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
