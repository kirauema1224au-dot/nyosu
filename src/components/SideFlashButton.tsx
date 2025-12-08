import React from 'react'

export function SideFlashButton() {
  return (
    <button
      onClick={() => { try { location.hash = '#flash' } catch {} }}
      className="flash-cta fixed left-3 top-6 z-50 select-none w-20 h-20 rounded-2xl text-slate-50 border border-slate-500/50 shadow-elev-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-400 backdrop-blur flex items-center justify-center"
      title="瞬間判断タイピング"
      aria-label="瞬間判断タイピングへ切り替え"
    >
      <div className="flex flex-col items-center leading-tight select-none">
        <span className="text-2xl" aria-hidden>⚡</span>
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-95">Flash</span>
      </div>
    </button>
  )
}
