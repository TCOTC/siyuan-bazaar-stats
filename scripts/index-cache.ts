import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseBazaarIndex } from '../src/lib/parse-index.ts'
import type { BazaarIndex } from '../src/lib/types.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const CACHE_DIR = path.join(ROOT, '.cache')
const INDEX_CACHE_FILE = path.join(CACHE_DIR, 'bazaar-index.json')

/**
 * 缓存有效期。`collect` 与 `build-data` 在同一工作流里相隔数秒，15 分钟足够；
 * 单独跑 `pnpm build` 时会因过期重新请求，不会用上很久以前的数据。
 */
const INDEX_CACHE_TTL_MS = 15 * 60 * 1000

/** 保存集市索引的原始响应，供同一次工作流的 `build-data` 复用，避免重复请求。 */
export async function writeIndexCache(raw: unknown): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(INDEX_CACHE_FILE, `${JSON.stringify(raw)}\n`)
}

/**
 * 读取 `collect` 刚写入的索引。文件缺失、过期或校验不通过都返回 `undefined`，
 * 由调用方决定重新请求还是失败。
 */
export async function readIndexCache(): Promise<BazaarIndex | undefined> {
  try {
    const info = await stat(INDEX_CACHE_FILE)
    if (Date.now() - info.mtimeMs > INDEX_CACHE_TTL_MS) {
      return undefined
    }
    return parseBazaarIndex(JSON.parse(await readFile(INDEX_CACHE_FILE, 'utf8')))
  } catch {
    return undefined
  }
}
