import React from "react"
import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTypingStore } from '../../store/useTypingStore'
import { validateStrict } from '../../lib/typing'
import { MistakeFX } from './MistakeFX'

export function InputBox() {
  const [glow, setGlow] = useState(false)
  const [failGlow, setFailGlow] = useState(false)
  const glowTimerRef = useRef<number | null>(null)
  const failGlowTimerRef = useRef<number | null>(null)
  const input = useTypingStore((s) => s.input)
  const setInput = useTypingStore((s) => s.setInput)
  const current = useTypingStore((s) => s.current)
  const submitIfComplete = useTypingStore((s) => s.submitIfComplete)
  const skip = useTypingStore((s) => s.skip)
  const ref = useRef<HTMLInputElement>(null)

  // フォーカスは Start ボタン押下時に制御（自動フォーカスはしない）

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Only submit if exact match
      if (current && validateStrict(input, current.romaji).completed) {
        // 演出を先に開始してから確定
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

  const wrapRef = useRef<HTMLDivElement>(null)

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
    <div ref={wrapRef} className="relative mt-3">
      <input
        id="typing-input"
        ref={ref}
        className={`w-full rounded border px-3 py-2 font-mono text-lg outline-none focus:ring-2 focus:ring-emerald-400 ${glow ? 'ring-2 ring-emerald-400 input-glow-success' : ''} ${failGlow ? 'border-4 border-red-500 input-shake' : ''}`}
        placeholder="Startをボタンで開始"
        value={input}
        onChange={(e) => {
          const next = e.target.value
          setInput(next)
          // 完全一致したらEnter不要で自動確定→次のお題へ
          if (current && validateStrict(next, current.romaji).completed) {
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
      <MistakeFX anchor={wrapRef} />
    </div>
  )
}
