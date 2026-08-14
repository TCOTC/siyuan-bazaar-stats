import { packageIconURL } from './constants.ts'
import { pickLocale } from './locale.ts'
import type { CatalogPackage } from './types.ts'

export function catalogDisplayName(pkg: CatalogPackage | undefined, fallback: string): string {
  return pickLocale(pkg?.displayName, fallback)
}

export function catalogDescription(pkg: CatalogPackage | undefined): string {
  return pickLocale(pkg?.description)
}

export function catalogIconURL(pkg: CatalogPackage | undefined): string | undefined {
  if (pkg?.repoHash) {
    return packageIconURL(pkg.repoHash)
  }
  return undefined
}

export function parseStageUpdated(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) {
    return undefined
  }
  return Math.floor(ms / 1000)
}

export function parseBazaarHash(raw: unknown): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('invalid rhy version')
  }
  const bazaar = (raw as { bazaar?: unknown }).bazaar
  if (typeof bazaar !== 'string' || !/^[a-f0-9]{7,40}$/i.test(bazaar)) {
    throw new Error('invalid rhy bazaar hash')
  }
  return bazaar
}
