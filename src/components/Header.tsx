import React from "react"
import { useTypingStore } from '../store/useTypingStore'

export function Header() {
  const target = useTypingStore((s) => s.difficultyTarget)
  return (
    <header className="sticky top-0 z-10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Adaptive Typing Game</h1>
        <div className="text-sm text-slate-600">Target Difficulty: <span className="font-medium text-slate-900">{target}</span></div>
      </div>
    </header>
  )
}
