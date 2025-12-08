export type FxMode = 'on' | 'off'

const KEY = 'typing:fx'

export function getFx(): FxMode {
  const v = (typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null) as FxMode | null
  if (v === 'on' || v === 'off') return v
  // default: follow system — if reduced motion, off; else on
  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return prefersReduced ? 'off' : 'on'
  }
  return 'on'
}

export function setFx(mode: FxMode) {
  try { localStorage.setItem(KEY, mode) } catch {}
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-fx', mode)
  }
}

export function toggleFx(): FxMode {
  const next: FxMode = getFx() === 'on' ? 'off' : 'on'
  setFx(next)
  return next
}

