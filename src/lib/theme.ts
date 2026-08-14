const STORAGE_KEY = 'siyuan-bazaar-stats-theme'

export type ThemeMode = 'light' | 'dark'

export function readTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
  } catch {
    // 隐私模式或禁用存储时回退到系统偏好。
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // 忽略无法写入的情况。
  }
  window.dispatchEvent(new Event('themechange'))
}

export function toggleTheme(): ThemeMode {
  const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
  applyTheme(next)
  return next
}
