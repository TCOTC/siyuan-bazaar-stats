import type { PackageType } from './types.ts'

export const TYPE_LABELS: Record<PackageType, string> = {
  plugins: '插件',
  themes: '主题',
  widgets: '挂件',
  icons: '图标',
  templates: '模板',
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function formatAverage(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDateTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDelta(value: number): string {
  if (value > 0) {
    return `▴ ${formatNumber(value)}`
  }
  if (value < 0) {
    return `▾ ${formatNumber(Math.abs(value))}`
  }
  return '–'
}

export function formatRank(index: number): string {
  return String(index + 1).padStart(3, '0')
}

export function githubRepoURL(repo: string): string {
  return `https://github.com/${repo}`
}
