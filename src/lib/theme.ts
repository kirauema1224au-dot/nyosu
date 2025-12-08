export type Theme = 'cyan' | 'blue' | 'purple' | 'gold'

const KEY = 'typing:theme'

export function getTheme(): Theme {
  const v = (typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null) as Theme | null
  if (v === 'cyan' || v === 'blue' || v === 'purple' || v === 'gold') return v
  return 'cyan'
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t) } catch {}
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', t)
  }
}

