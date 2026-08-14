import type { LocaleStrings } from './types.ts'

const preferredKeys = ['zh_CN', 'zh-CN', 'zh_Hans', 'default']

export function pickLocale(strings: LocaleStrings | undefined, fallback = ''): string {
  if (!strings) {
    return fallback
  }
  for (const key of preferredKeys) {
    const value = strings[key]?.trim()
    if (value) {
      return value
    }
  }
  for (const value of Object.values(strings)) {
    if (value.trim()) {
      return value.trim()
    }
  }
  return fallback
}
