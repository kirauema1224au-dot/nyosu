import React, { useMemo } from "react"
import { useTypingStore } from '../../store/useTypingStore'
import { splitForHighlight } from '../../lib/typing'

export function PromptView() {
  const current = useTypingStore((s) => s.current)
  const input = useTypingStore((s) => s.input)

  const { correct, next, rest, isMistake } = useMemo(() => {
    if (!current) return { correct: '', next: '', rest: '', isMistake: false }
    return splitForHighlight(input, current.romaji)
  }, [current, input])

  return (
    <div className="space-y-2">
      <div className="font-mono text-xl whitespace-pre break-all rounded border bg-white px-3 py-3 leading-relaxed">
        <span className="text-emerald-600">{correct}</span>
        <span
          className={
            isMistake
              ? 'bg-rose-100 text-rose-700 underline decoration-rose-300 underline-offset-2'
              : 'bg-amber-100 text-amber-700'
          }
        >
          {next || ' '}
        </span>
        <span className="text-slate-400">{rest}</span>
      </div>
    </div>
  )
}
