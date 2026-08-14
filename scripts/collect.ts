import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bazaarIndexURL, USER_AGENT } from '../src/lib/constants.ts'
import { diffStats, shouldWriteFullSnapshot, utcMonth } from '../src/lib/history.ts'
import { parseBazaarIndex, indexToStats } from '../src/lib/parse-index.ts'
import type { Catalog, CollectorState, SnapshotFile } from '../src/lib/types.ts'
import { loadCatalog } from './catalog.ts'
import { DATA_DIR, readJson, writeJson } from './io.ts'

export async function collect(now = Date.now()): Promise<{ changed: boolean, snapshot?: SnapshotFile }> {
  const index = parseBazaarIndex(await fetchJSON(bazaarIndexURL(now)))
  const nextStats = indexToStats(index)
  const previous = await readJson<CollectorState>(path.join(DATA_DIR, 'state.json'))
  const full = shouldWriteFullSnapshot(previous, index.publishedAt)
  const changes = full ? nextStats : diffStats(previous?.packages ?? {}, nextStats)

  const catalogPrevious = await readJson<Catalog>(path.join(DATA_DIR, 'catalog.json'))
  const catalog = await loadCatalog(Math.floor(now / 1000), catalogPrevious, Object.keys(index.packages))
  const catalogChanged = JSON.stringify(catalog.packages) !== JSON.stringify(catalogPrevious?.packages ?? {})
  if (catalogChanged || !catalogPrevious) {
    await writeJson(path.join(DATA_DIR, 'catalog.json'), catalog)
  }

  if (Object.keys(changes).length === 0) {
    console.log('no bazaar stats changes')
    return { changed: catalogChanged }
  }

  const snapshot: SnapshotFile = {
    t: index.publishedAt,
    g: index.generation,
    ...(full ? { full: true } : {}),
    p: changes,
  }
  await mkdir(path.join(DATA_DIR, 'snapshots'), { recursive: true })
  await appendJsonl(path.join(DATA_DIR, 'snapshots', `${utcMonth(index.publishedAt)}.jsonl`), snapshot)

  const state: CollectorState = {
    generation: index.generation,
    publishedAt: index.publishedAt,
    fetchedAt: Math.floor(now / 1000),
    lastFullAt: full ? index.publishedAt : previous?.lastFullAt ?? index.publishedAt,
    packages: nextStats,
  }
  await writeJson(path.join(DATA_DIR, 'state.json'), state)
  console.log(`wrote ${full ? 'full' : 'delta'} snapshot: ${Object.keys(changes).length} packages`)
  return { changed: true, snapshot }
}

async function fetchJSON(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`)
  }
  return await response.json()
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
