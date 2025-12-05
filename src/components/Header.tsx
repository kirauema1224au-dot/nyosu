import React from "react"

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Typing Game</h1>
      </div>
    </header>
  )
}
