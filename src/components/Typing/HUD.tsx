import React from "react"
import { useMemo } from 'react'
import { useTypingStore } from '../../store/useTypingStore'
import { computeWPM, computeAccuracy, progressRatio } from '../../lib/stats'

export function HUD() {
  const input = useTypingStore((s) => s.input)
  const mistakes = useTypingStore((s) => s.mistakes)
  const current = useTypingStore((s) => s.current)
  const startedAt = useTypingStore((s) => s.startedAt)

  const { wpm, acc, prog } = useMemo(() => {
    const now = performance.now()
    const ms = startedAt ? now - startedAt : 0
    return {
      wpm: computeWPM(input.length, ms),
      acc: computeAccuracy(input.length, mistakes),
      prog: progressRatio(input.length, current?.romaji.length ?? 0),
    }
  }, [input, mistakes, current, startedAt])

  return (
    <div className="flex items-center justify-between gap-4 mb-3">
      <Metric label="WPM" value={wpm.toFixed(1)} />
      <Metric label="Accuracy" value={`${acc.toFixed(1)}%`} />
      <div className="flex-1">
        <div className="text-xs text-slate-600 mb-1">Progress</div>
        <div className="h-2 bg-slate-200 rounded">
          <div className="h-2 bg-emerald-500 rounded transition-[width] duration-150" style={{ width: `${prog * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[90px]">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
