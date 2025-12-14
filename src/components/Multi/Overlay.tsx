import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMultiStore } from '../../store/useMultiStore'
import { Button } from '../ui/Button'
import { useTypingStore } from '../../store/useTypingStore'

export function MultiOverlay() {
  const isInRoom = useMultiStore((s) => s.isInRoom)
  const room = useMultiStore((s) => s.room)
  const mode = useMultiStore((s) => s.mode)
  const startAt = useMultiStore((s) => s.startAt)
  const durationSec = useMultiStore((s) => s.durationSec)
  const started = useMultiStore((s) => s.started)
  const collapsed = useMultiStore((s) => s.collapsed)
  const setCollapsed = useMultiStore((s) => s.setCollapsed)
  const leaveRoom = useMultiStore((s) => s.leaveRoom)
  const sendProgress = useMultiStore((s) => s.sendProgress)

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
    if (ms <= -300) return null
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
      if (mode === 'practice') {
        startPractice(durationSec)
      } else if (mode === 'flash') {
        try { window.dispatchEvent(new Event('typing:flash-session-start')) } catch {}
      }
    }, delay)
    return () => window.clearTimeout(id)
  }, [started, startAt, mode, durationSec, startPractice])

  // Listen game progress events and forward totals
  useEffect(() => {
    if (!isInRoom) return
    const onPC = () => { setCorrect((c) => { const n = c + 1; sendProgress({ score: score + 10, correctCount: n, mistakeCount: mistakes, timeouts }); setScore((s) => s + 10); return n }) }
    const onPM = () => { setMistakes((m) => { const n = m + 1; sendProgress({ score, correctCount: correct, mistakeCount: n, timeouts }); return n }) }
    const onPT = () => { setTimeouts((t) => { const n = t + 1; sendProgress({ score, correctCount: correct, mistakeCount: mistakes, timeouts: n }); return n }) }
    const onFC = () => { setCorrect((c) => { const n = c + 1; sendProgress({ score: score + 10, correctCount: n, mistakeCount: mistakes, timeouts }); setScore((s) => s + 10); return n }) }
    const onFM = () => { setMistakes((m) => { const n = m + 1; sendProgress({ score, correctCount: correct, mistakeCount: n, timeouts }); return n }) }
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
            {remainingSec != null && started && (
              <span className="text-xs font-semibold tabular-nums timer-heartbeat">{fmt(remainingSec)}</span>
            )}
            <button className="text-xs text-slate-300 hover:text-slate-100" onClick={() => setCollapsed(!collapsed)}>{collapsed ? '▢' : '▣'}</button>
            <Button size="sm" variant="secondary" onClick={() => leaveRoom()}>Leave</Button>
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
                    <td className="py-0.5">{i===0 ? '👑' : i+1}</td>
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
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="text-7xl font-extrabold text-slate-100 timer-heartbeat select-none">
            {countdown === 0 ? 'GO' : countdown}
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

