import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { USER_AGENT } from '../src/lib/constants.ts'
import type { SnapshotFile } from '../src/lib/types.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DATA_DIR = path.join(ROOT, 'data')

export async function fetchJSON(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`)
  }
  return await response.json()
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value)}\n`)
}

export async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const text = await readFile(filePath, 'utf8')
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function listFiles(dir: string, suffix: string): Promise<string[]> {
  try {
    const names = await readdir(dir)
    return names.filter((name) => name.endsWith(suffix)).sort()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function loadSnapshots(): Promise<SnapshotFile[]> {
  const dir = path.join(DATA_DIR, 'snapshots')
  const files = await listFiles(dir, '.jsonl')
  const snapshots: SnapshotFile[] = []
  for (const file of files) {
    snapshots.push(...await readJsonl<SnapshotFile>(path.join(dir, file)))
  }
  return snapshots.sort((left, right) => left.t - right.t || left.g.localeCompare(right.g))
}
