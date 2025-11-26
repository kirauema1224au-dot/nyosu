import React, { useCallback, useEffect, useRef, useState } from "react"
import { HUD } from './HUD'
import { PromptView } from './PromptView'
import { InputBox } from './InputBox'
import { useTypingStore } from '../../store/useTypingStore'
import { Game } from "../Game"

export function TypingCard() {
  const current = useTypingStore((s) => s.current)
  const init = useTypingStore((s) => s.init)
  const skip = useTypingStore((s) => s.skip)
  const finishedAt = useTypingStore((s) => s.finishedAt)

  // Local control for when the round actually starts
  const [started, setStarted] = useState(false)
  const prevPromptIdRef = useRef<number | null>(null)
  const suppressAutoStartOnceRef = useRef(false)
  const hasStartedOnceRef = useRef(false)

  const status: "idle" | "playing" | "finished" = !current
    ? "idle"
    : finishedAt
      ? "finished"
      : started
        ? "playing"
        : "idle"

  const onTimeUp = useCallback(() => {
    // 時間切れ時は次の問題へ（今は skip と同義）
    skip()
  }, [skip])

  // Auto-start when moving to a new prompt (only after Start pressed once; suppressed after Reset)
  useEffect(() => {
    const currentId = current?.id ?? null
    const prevId = prevPromptIdRef.current
    prevPromptIdRef.current = currentId

    // No prompt loaded yet
    if (currentId == null) {
      setStarted(false)
      return
    }

    // Suppress once (e.g., after Reset)
    if (suppressAutoStartOnceRef.current) {
      suppressAutoStartOnceRef.current = false
      setStarted(false)
      return
    }

    // If there was a previous prompt and it changed, auto-start countdown
    if (hasStartedOnceRef.current && prevId != null && prevId !== currentId) {
      setStarted(true)
      const el = document.getElementById('typing-input') as HTMLInputElement | null
      el?.focus()
      return
    }

    // First load: do not auto-start
    setStarted(false)
  }, [current])

  // Ensure initial data is loaded
  if (!current) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Practice</h2>
          <button className="text-sm px-2 py-1 rounded bg-slate-900 text-white" onClick={() => void init()}>
            Load Prompts
          </button>
        </div>
        <p className="text-sm text-slate-600">Click Load to initialize prompts.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Practice</h2>
        <div className="flex items-center gap-2">
          {status !== "playing" && (
            <button
              className="text-sm px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 animate-pulse"
              onClick={() => {
                hasStartedOnceRef.current = true
                setStarted(true)
                // Start直後に入力欄へフォーカス
                const el = document.getElementById('typing-input') as HTMLInputElement | null
                el?.focus()
              }}
              aria-label="Start round"
            >
              <span className="mr-1">🎀</span>Start
            </button>
          )}
          <button
            className="text-sm px-2 py-1 rounded border"
            onClick={() => {
              setStarted(false)
              // Avoid auto-start on the next prompt change triggered by Reset
              suppressAutoStartOnceRef.current = true
              hasStartedOnceRef.current = false
              void init()
            }}
          >
            Reset
          </button>
        </div>
      </div>
      {/* タイマー */}
      <Game prompt={current} status={status} onTimeUp={onTimeUp} />
      <HUD />
      <PromptView />
      <InputBox />
    </div>
  )
}
