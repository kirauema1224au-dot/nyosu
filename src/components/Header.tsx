import React from "react"

export function Header({ onOpenHelp, route }: { onOpenHelp?: () => void, route?: 'home' | 'flash' | 'flash-multi' | 'multi' | 'practice' }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/40 supports-[backdrop-filter]:bg-slate-900/30 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between text-slate-100">
        <h1 className="text-lg font-semibold tracking-tight">Typing Game</h1>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center rounded-md border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 px-2.5 py-1.5 text-sm"
            onClick={onOpenHelp}
          >
            使い方
          </button>
        </div>
      </div>
    </header>
  )
}
