import React from "react"

import { useEffect, useState } from 'react'
import { getTheme, setTheme, Theme } from '../lib/theme'

export function Header({ onOpenHelp, route }: { onOpenHelp?: () => void, route?: 'home' | 'flash' | 'flash-multi' | 'multi' }) {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())
  useEffect(() => { setTheme(theme) }, [theme])
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/40 supports-[backdrop-filter]:bg-slate-900/30 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between text-slate-100">
        <h1 className="text-lg font-semibold tracking-tight">Typing Game</h1>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 mr-1" aria-label="Theme selector">
            {(['cyan','blue','purple','gold'] as Theme[]).map(t => (
              <button
                key={t}
                className={`w-6 h-6 rounded-full border ${theme===t?'ring-2 ring-offset-2 ring-offset-slate-900':''}`}
                style={{ background: t==='gold' ? 'linear-gradient(90deg,#f59e0b,#d97706)' : t==='purple' ? 'linear-gradient(90deg,#8b5cf6,#6d28d9)' : t==='blue' ? 'linear-gradient(90deg,#3b82f6,#1d4ed8)' : 'linear-gradient(90deg,#06b6d4,#2563eb)' }}
                onClick={() => setThemeState(t)}
                aria-label={t}
                title={`テーマ: ${t}`}
              />
            ))}
          </div>
          <button
            className="inline-flex items-center rounded-md border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 px-2.5 py-1.5 text-sm"
            onClick={onOpenHelp}
          >
            使い方
          </button>
          {(route === 'flash' || route === 'flash-multi' || route === 'multi') && (
            <button
              className="inline-flex items-center rounded-md border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 px-2.5 py-1.5 text-sm"
              onClick={() => { try { location.hash = '' } catch {} }}
            >
              ← Practice
            </button>
          )}
          <button
            className={`inline-flex items-center rounded-md border border-slate-600 px-2.5 py-1.5 text-sm ${route==='multi' ? 'bg-slate-800/50 text-slate-400 cursor-default' : 'bg-slate-800/50 text-slate-200 hover:bg-slate-700/50'}`}
            onClick={() => { if (route !== 'multi') { try { location.hash = '#multi' } catch {} } }}
            aria-disabled={route==='multi'}
          >
            Multi
          </button>
        </div>
      </div>
    </header>
  )
}
