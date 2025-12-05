import React, { useEffect, useRef, useState } from 'react'
import { useTypingStore } from '../../store/useTypingStore'

type FXItem = { id: number; leftPx: number };

export function MistakeFX({ anchor }: { anchor: React.RefObject<HTMLDivElement> }) {
  const mistakes = useTypingStore((s) => s.mistakes)
  const prev = useRef(mistakes)
  const [items, setItems] = useState<FXItem[]>([])

  // simple id seed
  const seed = useRef(0)

  useEffect(() => {
    const diff = mistakes - prev.current
    const timeouts: number[] = []
    if (diff > 0) {
      // Trigger a short shake on the anchor container
      const el = anchor.current
      if (el) {
        el.classList.remove('shake-typing')
        // force reflow to restart animation if class already present
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        void (el as HTMLElement).offsetWidth
        el.classList.add('shake-typing')
        const rm = window.setTimeout(() => {
          el.classList.remove('shake-typing')
        }, 260)
        timeouts.push(rm)
      }
      // Spawn one ✕ per increment (usually 1)
      for (let i = 0; i < diff; i++) {
        const id = ++seed.current
        const rect = anchor.current?.getBoundingClientRect()
        // Horizontal offset around center of anchor
        const width = rect?.width ?? 0
        const jitter = (Math.random() - 0.5) * Math.min(40, Math.max(20, width * 0.1)) // ±20~±40px
        const leftPx = (width / 2) + jitter

        setItems((arr) => [...arr, { id, leftPx }])

        // Cleanup after animation ends
        const tid = window.setTimeout(() => {
          setItems((arr) => arr.filter((it) => it.id !== id))
        }, 700)
        timeouts.push(tid)
      }
    }
    prev.current = mistakes
    return () => {
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [mistakes, anchor])

  // Container sits absolutely over the anchor
  return (
    <div className="mistake-fx-container">
      {items.map((it) => (
        <span
          key={it.id}
          className="mistake-x select-none"
          style={{ left: `${it.leftPx}px`, top: '-6px' }}
        >
          ✕
        </span>
      ))}
    </div>
  )
}
