import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMultiStore } from '../../store/useMultiStore'
import { Button } from '../ui/Button'
import { useTypingStore } from '../../store/useTypingStore'
import { useToast } from '../ui/Toast'

export function MultiOverlay() {
  const isInRoom = useMultiStore((s) => s.isInRoom)
  const room = useMultiStore((s) => s.room)
  const mode = useMultiStore((s) => s.mode)
  const difficulty = useMultiStore((s) => s.difficulty)
  const startAt = useMultiStore((s) => s.startAt)
  const durationSec = useMultiStore((s) => s.durationSec)
  const started = useMultiStore((s) => s.started)
  const collapsed = useMultiStore((s) => s.collapsed)
  const setCollapsed = useMultiStore((s) => s.setCollapsed)
  const leaveRoom = useMultiStore((s) => s.leaveRoom)
  const sendProgress = useMultiStore((s) => s.sendProgress)
  const { show } = useToast()

  // Bridge local progress to server
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [timeouts, setTimeouts] = useState(0)

  // Practice start hook
  const startPractice = useTypingStore((s) => s.startSession)

  // Clock
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const endsAt = useMemo(() => (startAt ? startAt + durationSec * 1000 : null), [startAt, durationSec])
  const remainingSec = useMemo(() => {
    if (!endsAt) return null
    return Math.max(0, Math.ceil((endsAt - now) / 1000))
  }, [endsAt, now])

  // Countdown 3-2-1-GO before start
  const countdown = useMemo(() => {
    if (!startAt) return null
    const ms = startAt - now
    if (ms <= -800) return null // Hold GO for 800ms
    if (ms > 3000) return null
    const sec = Math.ceil(ms / 1000)
    return sec > 0 ? sec : 0 // 0 => GO
  }, [startAt, now])

  // Trigger start on each game at startAt
  const startOnceRef = useRef(false)
  useEffect(() => {
    if (!started || !startAt || startOnceRef.current) return
    const delay = Math.max(0, startAt - Date.now())
    const id = window.setTimeout(() => {
      startOnceRef.current = true
      if (mode?.startsWith('practice')) {
        // Use difficulty from store
        if (difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard') {
          useTypingStore.getState().setTimeMode(difficulty)
        } else {
          useTypingStore.getState().setTimeMode('normal') // Fallback
        }
        startPractice(durationSec)
      } else if (mode === 'flash') {
        try { window.dispatchEvent(new Event('typing:flash-session-start')) } catch { }
      }
    }, delay)
    return () => window.clearTimeout(id)
  }, [started, startAt, mode, difficulty, durationSec, startPractice])

  // Listen game progress events and forward totals
  useEffect(() => {
    if (!isInRoom) return
    const onPC = () => { setCorrect((c) => { const n = c + 1; sendProgress({ score: score + 10, correctCount: n, mistakeCount: mistakes, timeouts }); setScore((s) => s + 10); return n }) }
    const onPM = () => {
      setMistakes((m) => {
        const n = m + 1
        const nextScore = Math.max(0, score - 5)
        setScore(nextScore)
        sendProgress({ score: nextScore, correctCount: correct, mistakeCount: n, timeouts })
        return n
      })
    }
    const onPT = () => { setTimeouts((t) => { const n = t + 1; sendProgress({ score, correctCount: correct, mistakeCount: mistakes, timeouts: n }); return n }) }
    const onFC = () => { setCorrect((c) => { const n = c + 1; sendProgress({ score: score + 10, correctCount: n, mistakeCount: mistakes, timeouts }); setScore((s) => s + 10); return n }) }
    const onFM = () => {
      setMistakes((m) => {
        const n = m + 1
        const nextScore = Math.max(0, score - 5)
        setScore(nextScore)
        sendProgress({ score: nextScore, correctCount: correct, mistakeCount: n, timeouts })
        return n
      })
    }
    const onFT = () => { setTimeouts((t) => { const n = t + 1; sendProgress({ score, correctCount: correct, mistakeCount: mistakes, timeouts: n }); return n }) }
    window.addEventListener('typing:practice-correct', onPC as EventListener)
    window.addEventListener('typing:practice-mistake', onPM as EventListener)
    window.addEventListener('typing:practice-timeout', onPT as EventListener)
    window.addEventListener('typing:flash-correct', onFC as EventListener)
    window.addEventListener('typing:flash-mistake', onFM as EventListener)
    window.addEventListener('typing:flash-timeout', onFT as EventListener)
    return () => {
      window.removeEventListener('typing:practice-correct', onPC as EventListener)
      window.removeEventListener('typing:practice-mistake', onPM as EventListener)
      window.removeEventListener('typing:practice-timeout', onPT as EventListener)
      window.removeEventListener('typing:flash-correct', onFC as EventListener)
      window.removeEventListener('typing:flash-mistake', onFM as EventListener)
      window.removeEventListener('typing:flash-timeout', onFT as EventListener)
    }
  }, [isInRoom, sendProgress, score, correct, mistakes, timeouts])

  if (!isInRoom || !room) return null

  const players = Object.values(room.players).sort((a, b) => b.score - a.score || a.mistakeCount - b.mistakeCount)

  return (
    <>
      {/* Small overlay card (top-right) */}
      <div className="fixed top-3 right-3 z-40 w-[320px] border border-slate-700 glass-surface rounded-md shadow-elev-1">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-xs text-slate-300">Room <span className="font-mono text-slate-100">{room.roomId}</span></div>
          <div className="flex items-center gap-2">
            {mode && <span className="px-2 py-0.5 rounded-full text-[10px] border border-slate-600 text-slate-200">{mode.toUpperCase()}</span>}
            {difficulty && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${difficultyStyles[difficulty] ?? difficultyStyles.normal}`}>{difficulty.toUpperCase()}</span>}
            {remainingSec != null && started && (
              <span className="text-xs font-semibold tabular-nums timer-heartbeat">{fmt(remainingSec)}</span>
            )}
            <button className="text-xs text-slate-300 hover:text-slate-100" onClick={() => setCollapsed(!collapsed)}>{collapsed ? '▢' : '▣'}</button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                try {
                  // End practice session if running (saves record and clears timers/UI)
                  useTypingStore.getState().endSession()
                } catch { }
                // Reset local overlay counters
                setScore(0); setCorrect(0); setMistakes(0); setTimeouts(0)
                // Leave room on socket
                leaveRoom()
                // Navigate to home to ensure all game UIs unmount
                try { if (location.hash !== '') location.hash = '' } catch { }
                // Toast feedback
                try {
                  show({ title: 'Left Room', message: '退出し、ゲームをリセットしました。', variant: 'success' })
                } catch { }
              }}
            >
              Leave
            </Button>
          </div>
        </div>
        {!collapsed && (
          <div className="px-3 pb-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left">#</th>
                  <th className="text-left">Name</th>
                  <th className="text-right">Pts</th>
                  <th className="text-right">✅</th>
                  <th className="text-right">❌</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id} className="text-slate-100">
                    <td className="py-0.5">{i === 0 ? '👑' : i + 1}</td>
                    <td className="py-0.5">{p.name}</td>
                    <td className="py-0.5 text-right tabular-nums">{p.score}</td>
                    <td className="py-0.5 text-right tabular-nums">{p.correctCount}</td>
                    <td className="py-0.5 text-right tabular-nums">{p.mistakeCount}</td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr><td colSpan={5} className="text-slate-400 py-1">No players</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Big countdown overlay center */}
      {countdown != null && (
        <div className={`fixed inset-0 z-30 flex items-center justify-center pointer-events-none transition-colors duration-300 ${countdown === 0 ? 'bg-transparent' : 'bg-black/40 backdrop-blur-sm'}`}>
          <div
            className={`font-extrabold select-none transition-all duration-300 ${countdown === 0
              ? 'text-9xl text-emerald-400 animate-ping'
              : countdown === 1
                ? 'text-8xl text-yellow-400 animate-pulse'
                : countdown === 2
                  ? 'text-8xl text-amber-500 animate-pulse'
                  : 'text-8xl text-rose-500 animate-pulse'
              }`}
          >
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      )}
    </>
  )
}

function fmt(sec: number) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

const difficultyStyles: { [key: string]: string } = {
  easy: 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-200',
  normal: 'border border-sky-500/50 bg-sky-500/20 text-sky-200',
  hard: 'border border-rose-500/50 bg-rose-500/20 text-rose-200',
}
