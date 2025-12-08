import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = {
  id: number
  title?: string
  message: string
  variant?: 'info' | 'success' | 'error'
  duration?: number
}

type ToastCtx = {
  show: (t: Omit<Toast, 'id'>) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    const toast: Toast = { id, duration: 3500, ...t }
    setToasts((arr) => [...arr, toast])
    window.setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), toast.duration)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-3 right-3 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={boxClass(t.variant)}>
            {t.title && <div className="text-xs font-semibold text-slate-100">{t.title}</div>}
            <div className="text-sm text-slate-100">{t.message}</div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function boxClass(variant: Toast['variant']) {
  const base = 'rounded-md border px-3 py-2 shadow-elev-1 glass-surface border-slate-700 min-w-[220px]'
  switch (variant) {
    case 'success':
      return base + ' border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
    case 'error':
      return base + ' border-rose-500/50 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
    default:
      return base
  }
}

