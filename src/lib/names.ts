const reservedPackageNames = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

/** 与思源内核 `IsValidPackageName` 一致：可安全用作跨平台目录名。 */
export function isValidPackageName(packageName: string): boolean {
  if (
    packageName.length < 1 || packageName.length > 255 ||
    packageName.startsWith('.') || packageName.startsWith(' ') ||
    packageName.endsWith('.') || packageName.endsWith(' ') ||
    packageName.includes('..')
  ) {
    return false
  }
  for (let i = 0; i < packageName.length; i++) {
    const char = packageName.charCodeAt(i)
    if (char < 0x20 || char > 0x7e || `<>&'":/\\|?*`.includes(packageName[i]!)) {
      return false
    }
  }
  return !reservedPackageNames.has(packageName.toUpperCase())
}

/** 与思源内核 `isValidBazaarRepo` 一致：`owner/repo`。 */
export function isValidBazaarRepo(repo: string): boolean {
  if ((repo.match(/\//g) ?? []).length !== 1 || repo.startsWith('/') || repo.endsWith('/')) {
    return false
  }
  for (const part of repo.split('/')) {
    if (part === '' || part === '.' || part === '..') {
      return false
    }
    for (let i = 0; i < part.length; i++) {
      const char = part.charCodeAt(i)
      const ok =
        (char >= 97 && char <= 122) ||
        (char >= 65 && char <= 90) ||
        (char >= 48 && char <= 57) ||
        char === 45 || char === 95 || char === 46
      if (!ok) {
        return false
      }
    }
  }
  return true
}
