import React, { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useTypingStore } from '../../store/useTypingStore'
import { splitForHighlight, isAcceptedRomaji } from '../../lib/typing'
import { MistakeFX } from './MistakeFX'

export function PromptView() {
  const current = useTypingStore((s) => s.current)
  const input = useTypingStore((s) => s.input)
  const setInput = useTypingStore((s) => s.setInput)
  const submitIfComplete = useTypingStore((s) => s.submitIfComplete)
  const skip = useTypingStore((s) => s.skip)

  const { correct, next, rest, isMistake } = useMemo(() => {
    if (!current) return { correct: '', next: '', rest: '', isMistake: false }
    return splitForHighlight(input, current.romaji)
  }, [current, input])

  const [glow, setGlow] = useState(false)
  const [failGlow, setFailGlow] = useState(false)
  const glowTimerRef = useRef<number | null>(null)
  const failGlowTimerRef = useRef<number | null>(null)

  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (current && isAcceptedRomaji(input, current.romaji)) {
        setGlow(true)
        if (glowTimerRef.current) window.clearTimeout(glowTimerRef.current)
        glowTimerRef.current = window.setTimeout(() => setGlow(false), 650)
        submitIfComplete()
      }
      e.preventDefault()
    } else if (e.key === 'Escape') {
      skip()
      e.preventDefault()
    }
  }

  useEffect(() => {
    const onTimeUp = () => {
      setFailGlow(true)
      if (failGlowTimerRef.current) window.clearTimeout(failGlowTimerRef.current)
      failGlowTimerRef.current = window.setTimeout(() => setFailGlow(false), 750)
    }
    window.addEventListener('typing-timeup', onTimeUp)
    return () => {
      if (glowTimerRef.current) window.clearTimeout(glowTimerRef.current)
      if (failGlowTimerRef.current) window.clearTimeout(failGlowTimerRef.current)
      window.removeEventListener('typing-timeup', onTimeUp)
    }
  }, [])

  return (
    <div className="space-y-2 flex flex-col items-center text-center">
      <div
        ref={anchorRef}
        className={`relative mx-auto w-full max-w-xl font-mono text-xl whitespace-pre-wrap break-words rounded border bg-white px-3 py-3 leading-relaxed mt-3 ${glow ? 'input-glow-success ring-2 ring-emerald-400' : ''} ${failGlow ? 'input-shake border-rose-600 border-2' : ''}`}
        role="textbox"
        aria-label="お題入力"
        tabIndex={0}
        onClick={() => hiddenInputRef.current?.focus()}
        onFocus={() => hiddenInputRef.current?.focus()}
      >
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
        {/* hidden but focusable input to capture typing */}
        <input
          id="typing-input"
          ref={hiddenInputRef}
          className="absolute left-0 top-0 h-0 w-0 opacity-0"
          value={input}
          onChange={(e) => {
            const nextVal = e.target.value
            setInput(nextVal)
            if (current && isAcceptedRomaji(nextVal, current.romaji)) {
              setGlow(true)
              if (glowTimerRef.current) window.clearTimeout(glowTimerRef.current)
              glowTimerRef.current = window.setTimeout(() => setGlow(false), 650)
              submitIfComplete()
            }
          }}
          onKeyDown={onKeyDown}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <MistakeFX anchor={anchorRef} />
      </div>
    </div>
  )
}
