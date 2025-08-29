const KEY = 'ne_theme' // 'light' | 'dark'

export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getTheme() {
  const saved = localStorage.getItem(KEY)
  return saved || getSystemTheme()
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-bs-theme', t)
  localStorage.setItem(KEY, t)

  window.dispatchEvent(new CustomEvent('ne-theme-change', { detail: { theme: t } }))
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}

export function initTheme() {
  applyTheme(getTheme())

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    const saved = localStorage.getItem(KEY)
    if (!saved) applyTheme(getSystemTheme())
  })
}
