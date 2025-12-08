import React, { useEffect } from 'react'
import { cn } from '../../lib/cn'

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({ open, title, onClose, children, footer, className }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative z-10 w-full max-w-lg rounded-xl border border-slate-700 glass-surface shadow-elev-2', className)}
      >
        {title && (
          <div className="px-4 pt-4 pb-2 text-slate-100 text-base font-semibold">{title}</div>
        )}
        <div className="px-4 py-2 text-slate-200">
          {children}
        </div>
        {footer && (
          <div className="px-4 pb-4 pt-2 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  )
}

