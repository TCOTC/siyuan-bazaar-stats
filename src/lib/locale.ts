import type { LocaleStrings } from './types.ts'

const preferredKeys = ['zh_CN', 'zh-CN', 'zh_Hans', 'default']

/** 与思源内核 `html.UnescapeString` 一致：还原 stage 里已 HTML 转义的展示文本。 */
export function unescapeHtml(value: string): string {
  if (!value.includes('&')) {
    return value
  }
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*34;/g, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/gi, '&')
}

export function pickLocale(strings: LocaleStrings | undefined, fallback = ''): string {
  if (!strings) {
    return unescapeHtml(fallback)
  }
  for (const key of preferredKeys) {
    const value = strings[key]?.trim()
    if (value) {
      return unescapeHtml(value)
    }
  }
  for (const value of Object.values(strings)) {
    if (value.trim()) {
      return unescapeHtml(value.trim())
    }
  }
  return unescapeHtml(fallback)
}
