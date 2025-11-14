import React from "react"
import { HUD } from './HUD'
import { PromptView } from './PromptView'
import { InputBox } from './InputBox'
import { useTypingStore } from '../../store/useTypingStore'

export function TypingCard() {
  const current = useTypingStore((s) => s.current)
  const init = useTypingStore((s) => s.init)

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
        <button className="text-sm px-2 py-1 rounded border" onClick={() => void init()}>
          Reset
        </button>
      </div>
      <HUD />
      <PromptView />
      <InputBox />
    </div>
  )
}
