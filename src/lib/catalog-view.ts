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
