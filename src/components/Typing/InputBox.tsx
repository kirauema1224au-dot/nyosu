import React from "react"
import { KeyboardEvent, useRef } from 'react'
import { useTypingStore } from '../../store/useTypingStore'
import { validateStrict } from '../../lib/typing'

export function InputBox() {
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
        submitIfComplete()
      }
      e.preventDefault()
    } else if (e.key === 'Escape') {
      skip()
      e.preventDefault()
    }
  }

  return (
    <input
      id="typing-input"
      ref={ref}
      className="mt-3 w-full rounded border px-3 py-2 font-mono text-lg outline-none focus:ring-2 focus:ring-emerald-400"
      placeholder="Startをボタンで開始"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={onKeyDown}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
    />
  )
}
