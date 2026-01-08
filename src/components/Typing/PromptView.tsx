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
  const anchorRef = useRef<HTMLDivElement>(null!)

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
    <div className="space-y-4 flex flex-col items-center text-center">
      <div
        ref={anchorRef}
        className={`
          relative mx-auto w-full max-w-2xl font-mono text-xl sm:text-2xl whitespace-pre-wrap break-words 
          rounded-2xl border-2 px-6 py-6 leading-relaxed mt-4 transition-all duration-300
          ${glow
            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-[1.01]'
            : failGlow
              ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-shake'
              : 'bg-slate-950/30 border-slate-700/50 hover:border-slate-600'
          }
          backdrop-blur-md
        `}
        role="textbox"
        aria-label="お題入力"
        tabIndex={0}
        onClick={() => hiddenInputRef.current?.focus()}
        onFocus={() => hiddenInputRef.current?.focus()}
      >
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-600 rounded-tl-lg opacity-30" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-600 rounded-tr-lg opacity-30" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-600 rounded-bl-lg opacity-30" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-600 rounded-br-lg opacity-30" />

        <span className="text-emerald-400 drop-shadow-sm">{correct}</span>
        <span
          className={
            isMistake
              ? 'bg-rose-500/20 text-rose-400 underline decoration-rose-500/50 underline-offset-4 rounded-sm px-0.5'
              : 'bg-emerald-500/20 text-emerald-300 rounded-sm px-0.5'
          }
        >
          {next || ' '}
        </span>
        <span className="text-slate-600 pl-0.5">{rest}</span>
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

      {/* Helper text */}
      <div className="text-xs text-slate-500 font-mono tracking-widest uppercase opacity-60">
        Type to start
      </div>
    </div>
  )
}
