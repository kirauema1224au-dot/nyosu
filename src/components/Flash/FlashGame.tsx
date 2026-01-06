import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTypingStore } from '../../store/useTypingStore'
import type { Prompt } from '../../api/prompts'
import { isAcceptedRomaji, prefixOKVariants } from '../../lib/typing'
import { Heart, Trophy, Zap, AlertTriangle, CheckCircle2, Timer, Keyboard } from "lucide-react"

type Phase = 'idle' | 'countdown' | 'revealing' | 'hidden' | 'showing-answer' | 'finished'

const SESSION_SECONDS = 120
const REVEAL_MS = 1500 // 1.5s reveal per requirement
const PER_PROMPT_SECONDS = 10
const MAX_TIMEOUTS = 3

export function FlashGame() {
  const prompts = useTypingStore((s) => s.prompts)
  const init = useTypingStore((s) => s.init)

  const [sessionEndsAt, setSessionEndsAt] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [current, setCurrent] = useState<Prompt | null>(null)
  const [input, setInput] = useState('')
  const [solved, setSolved] = useState(0)
  const [timeouts, setTimeouts] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [perEndsAt, setPerEndsAt] = useState<number | null>(null)
  const [showAnswerJP, setShowAnswerJP] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showStart, setShowStart] = useState<boolean>(false)

  const hiddenInputRef = useRef<HTMLInputElement | null>(null)
  const timers = useRef<number[]>([])
  const focusGuard = useRef<{ key: string | null }>({ key: null })
  const shakeTimerRef = useRef<number | null>(null)
  const glowTimerRef = useRef<number | null>(null)
  const failGlowTimerRef = useRef<number | null>(null)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [shake, setShake] = useState(false)
  const [glow, setGlow] = useState(false)
  const [failGlow, setFailGlow] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // 初回ロードでお題を準備
  useEffect(() => { void init() }, [init])

  // External start for Multi mode
  useEffect(() => {
    const onMultiStart = () => {
      if (phase === 'idle' || phase === 'finished') startSession()
    }
    window.addEventListener('typing:flash-session-start', onMultiStart as EventListener)
    return () => window.removeEventListener('typing:flash-session-start', onMultiStart as EventListener)
  }, [phase])

  // ランダムに次のお題
  const nextPrompt = useMemo(() => {
    return () => {
      if (!prompts.length) return null
      const idx = Math.floor(Math.random() * prompts.length)
      return prompts[idx]
    }
  }, [prompts])

  // スタート処理
  const clearTimers = () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = [] }

  const startSession = () => {
    // prevent re-entrance if not idle
    if (phase !== 'idle' && phase !== 'finished') return
    clearTimers()
    setSolved(0)
    setTimeouts(0)
    setMistakes(0)
    setInput('')
    setShowAnswerJP(null)
    setShake(false)
    setGlow(false)
    setFailGlow(false)
    // iOS セーフティ: ユーザー操作起点で一度フォーカスを確立
    try { hiddenInputRef.current?.focus({ preventScroll: true } as any) } catch { }
    // 3-2-1 countdown
    setPhase('countdown')
    setCountdown(3)
    const t1 = window.setTimeout(() => setCountdown(2), 1000)
    const t2 = window.setTimeout(() => setCountdown(1), 2000)
    const t3 = window.setTimeout(() => {
      // 1 のあとに START を短く見せてから開始
      setCountdown(null)
      setShowStart(true)
      const tStart = window.setTimeout(() => {
        setShowStart(false)
        const now = Date.now()
        setSessionEndsAt(now + SESSION_SECONDS * 1000)
        startRound(nextPrompt())
      }, 600)
      timers.current.push(tStart)
    }, 3000)
    timers.current.push(t1, t2, t3)
  }

  const endSession = (opts?: { goTo?: 'finished' | 'idle' }) => {
    const goTo = opts?.goTo ?? 'finished'
    if (phase === 'finished' && goTo === 'finished') return
    clearTimers()
    const record = {
      mode: 'flash' as const,
      startedAt: Date.now() - (SESSION_SECONDS * 1000), // 近似、厳密でなくてOK
      endedAt: Date.now(),
      solved,
      mistakes,
      timeouts,
      points: solved * 100,
    }
    try {
      const key = 'typing:flash-sessions'
      const raw = localStorage.getItem(key)
      const arr = raw ? JSON.parse(raw) as any[] : []
      arr.push(record)
      localStorage.setItem(key, JSON.stringify(arr.slice(-200)))
      try { window.dispatchEvent(new CustomEvent('typing:flash-sessions-updated', { detail: record })) } catch { }
    } catch { }
    if (goTo === 'idle') {
      // 開始画面に戻す
      setPhase('idle')
      setSessionEndsAt(null)
      setCurrent(null)
      setInput('')
      setSolved(0)
      setTimeouts(0)
      setMistakes(0)
      setPerEndsAt(null)
      setShowAnswerJP(null)
      setCountdown(null)
    } else {
      setPhase('finished')
    }
  }

  // ラウンド開始（表示→隠す→入力受付）
  const startRound = (p: Prompt | null) => {
    if (!p) return
    setCurrent(p)
    setInput('')
    setShowAnswerJP(null)
    setPhase('revealing')
    const id = window.setTimeout(() => {
      setPhase('hidden')
      setPerEndsAt(Date.now() + PER_PROMPT_SECONDS * 1000)
    }, REVEAL_MS)
    timers.current.push(id)
  }

  // セッション残り時間の監視
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  // cleanup shake timer on unmount
  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current)
      if (glowTimerRef.current) window.clearTimeout(glowTimerRef.current)
      if (failGlowTimerRef.current) window.clearTimeout(failGlowTimerRef.current)
    }
  }, [])
  useEffect(() => {
    if (!sessionEndsAt) return
    if (now >= sessionEndsAt) endSession({ goTo: 'idle' })
  }, [now, sessionEndsAt])

  // 1問のタイムアウト監視
  useEffect(() => {
    if (phase !== 'hidden') return
    if (!perEndsAt) return
    const id = window.setInterval(() => {
      if (Date.now() >= perEndsAt) {
        window.clearInterval(id)
        onTimeOut()
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, perEndsAt])

  // 派生値（早期returnより前に配置してHooks順序を安定化）
  const remainingSec = useMemo(() => {
    if (!sessionEndsAt) return 0
    return Math.max(0, Math.ceil((sessionEndsAt - now) / 1000))
  }, [sessionEndsAt, now])

  const perRemaining = useMemo(() => {
    if (!perEndsAt || phase !== 'hidden') return null
    return Math.max(0, Math.ceil((perEndsAt - now) / 1000))
  }, [perEndsAt, phase, now])
  const perRatio = useMemo(() => {
    if (perRemaining == null) return 0
    return Math.max(0, Math.min(1, 1 - perRemaining / PER_PROMPT_SECONDS))
  }, [perRemaining])

  const onTimeOut = () => {
    // 正解（romaji）を短く表示し、その後に次へ
    if (current) setShowAnswerJP(current.text)
    setPhase('showing-answer')
    setTimeouts((t) => t + 1)
    try { window.dispatchEvent(new Event('typing:flash-timeout')) } catch { }
    // 失敗演出（赤いシェイク）
    setFailGlow(true)
    if (failGlowTimerRef.current) window.clearTimeout(failGlowTimerRef.current)
    failGlowTimerRef.current = window.setTimeout(() => setFailGlow(false), 750)
    // ライフ尽きたら終了
    const after = () => {
      if (timeouts + 1 >= MAX_TIMEOUTS) {
        // セッションを終了し、結果は保存。その後、開始画面（idle）へ戻す。
        endSession({ goTo: 'idle' })
      } else {
        startRound(nextPrompt())
      }
    }
    window.setTimeout(after, 800)
  }

  const onChange = (v: string) => {
    const prev = input
    const next = v
    if (!current) { setInput(next); return }
    const isAdding = next.length > prev.length
    const isDeleting = next.length < prev.length
    const isSameLength = next.length === prev.length && next !== prev

    if (isAdding || isSameLength) {
      const okPrefix = prefixOKVariants(next, current.romaji)
      if (!okPrefix) {
        setMistakes((m) => m + 1)
        // visual feedback（赤いシェイク）
        setFailGlow(true)
        if (failGlowTimerRef.current) window.clearTimeout(failGlowTimerRef.current)
        failGlowTimerRef.current = window.setTimeout(() => setFailGlow(false), 650)
        try { window.dispatchEvent(new Event('typing:flash-mistake')) } catch { }
        return // block invalid key
      }
    }

    setInput(next)
    // 完全一致したらアニメーションを出してから次へ
    if (isAcceptedRomaji(next, current.romaji)) {
      setSolved((s) => s + 1)
      try { window.dispatchEvent(new Event('typing:flash-correct')) } catch { }
      // 成功時はグローのみ（Practice と同様）
      setGlow(true)
      if (glowTimerRef.current) window.clearTimeout(glowTimerRef.current)
      glowTimerRef.current = window.setTimeout(() => setGlow(false), 650)
      const id = window.setTimeout(() => startRound(nextPrompt()), 320)
      timers.current.push(id)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (current && isAcceptedRomaji(input, current.romaji)) {
        setSolved((s) => s + 1)
        try { window.dispatchEvent(new Event('typing:flash-correct')) } catch { }
        setGlow(true)
        if (glowTimerRef.current) window.clearTimeout(glowTimerRef.current)
        glowTimerRef.current = window.setTimeout(() => setGlow(false), 650)
        const id = window.setTimeout(() => startRound(nextPrompt()), 320)
        timers.current.push(id)
      }
      e.preventDefault()
    }
  }

  // hidden 遷移直後に入力へフォーカス（描画完了後に実行）
  useEffect(() => {
    if (phase !== 'hidden') return
    const key = `${phase}:${current ? current.id ?? current.text : 'none'}`
    if (focusGuard.current.key === key) return
    focusGuard.current.key = key
    let cancelled = false
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (cancelled) return
        try {
          const el = hiddenInputRef.current
          if (!el) return
          // readonly が付いている可能性はあるが hidden なら解除されている
          if (typeof el.focus === 'function') {
            ; (el as any).focus({ preventScroll: true })
          } else {
            el.focus()
          }
        } catch { }
      })
      timers.current.push(raf2 as unknown as number)
    })
    timers.current.push(raf1 as unknown as number)
    return () => { cancelled = true }
  }, [phase, current])

  if (!prompts.length) {
    return (
      <div className="rounded-lg border border-slate-700/50 glass-surface p-8 text-sm text-slate-200 text-center animate-pulse">
        Initializing Flash System...
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl p-8 space-y-8 animate-in fade-in zoom-in duration-300 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 drop-shadow-sm flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            MISSION REPORT
          </h2>
          <button
            className="text-xs font-bold px-4 py-2 rounded-full border border-slate-600 bg-slate-800/40 hover:bg-slate-700/60 transition-colors text-slate-400 uppercase tracking-widest"
            onClick={() => { try { location.hash = '' } catch { } }}
          >
            Exit
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 relative z-10">
          <StatCard label="SCORE" value={solved * 100} icon={<Zap className="w-4 h-4 text-amber-400" />} />
          <StatCard label="SOLVED" value={solved} icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
          <StatCard label="MISS" value={mistakes} icon={<AlertTriangle className="w-4 h-4 text-rose-400" />} />
        </div>

        <div className="flex gap-3 justify-center relative z-10 pt-4">
          <button
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold shadow-lg shadow-amber-900/20 transform hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            onClick={() => { setPhase('idle'); setSessionEndsAt(null); startSession() }}
          >
            RETRY MISSION
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 overflow-hidden min-h-[500px] flex flex-col shadow-2xl transition-all duration-500">
      {/* Ambient Glow */}
      <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none transition-opacity duration-1000 ${phase === 'idle' ? 'opacity-20' : 'opacity-40 animate-pulse-slow'}`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shadow-inner">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold tracking-wider text-slate-100 drop-shadow-sm">
            FLASH <span className="text-amber-500 font-extrabold italic">BLITZ</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {phase === 'idle' && (
            <button
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold shadow-lg shadow-amber-900/20 transform hover:scale-105 transition-all text-sm uppercase tracking-wide"
              onClick={() => startSession()}
            >
              Start Mission
            </button>
          )}
          <button
            className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => { clearTimers(); setPhase('idle'); setSessionEndsAt(null); setCurrent(null); setInput(''); setSolved(0); setTimeouts(0); setMistakes(0); setPerEndsAt(null); setShowAnswerJP(null); setCountdown(null); setShowStart(false) }}
            disabled={phase === 'idle'}
            title="Reset Session"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HUD Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 mb-8">
        <GameStat label="SCORE" value={solved * 100} color="text-amber-400" />
        <GameStat label="SOLVED" value={solved} color="text-emerald-400" />
        <GameStat label="MISS" value={mistakes} color="text-rose-400" />

        {/* Lives */}
        <div className="flex flex-col justify-center px-4 py-3 rounded-xl bg-slate-950/30 border border-slate-800/50 backdrop-blur-sm">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">LIVES</div>
          <div className="flex gap-1">
            {Array.from({ length: MAX_TIMEOUTS }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 transition-all duration-300 ${i < (MAX_TIMEOUTS - timeouts) ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'fill-slate-800 text-slate-800'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Gameplay Area */}
      {phase !== 'idle' && (
        <div className="flex-1 flex flex-col justify-center relative z-10 min-h-[200px]">

          {/* Prompt Display */}
          <div className="h-24 flex items-center justify-center relative perspective-500">
            {phase === 'revealing' && current && (
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 tracking-tight animate-in fade-in zoom-in duration-300 drop-shadow-2xl">
                {current.text}
              </div>
            )}
            {phase === 'showing-answer' && showAnswerJP && (
              <div className="text-xl font-bold px-6 py-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-in slide-in-from-bottom-2">
                <span className="opacity-70 text-xs uppercase mr-2 tracking-widest">Answer:</span>
                {showAnswerJP}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex justify-center mt-6 relative">
            <div
              ref={anchorRef}
              className={`
                relative w-full max-w-2xl transition-all duration-200
                rounded-2xl border-2 backdrop-blur-md px-6 py-6 text-center font-mono text-2xl tracking-wider
                ${phase === 'hidden' && input.length === 0 ? 'border-slate-700/50 bg-slate-900/30' : ''}
                ${phase === 'hidden' && input.length > 0 ? 'border-sky-500/50 bg-slate-900/50 shadow-[0_0_20px_rgba(14,165,233,0.1)]' : ''}
                ${glow ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_40px_rgba(52,211,153,0.3)] scale-[1.02]' : ''}
                ${failGlow ? 'border-rose-500 bg-rose-950/30 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-shake' : ''}
                ${!glow && !failGlow && phase === 'hidden' ? 'hover:border-slate-600' : ''}
              `}
              onClick={() => hiddenInputRef.current?.focus()}
            >
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-600 rounded-tl-lg opacity-50" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-600 rounded-tr-lg opacity-50" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-600 rounded-bl-lg opacity-50" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-600 rounded-br-lg opacity-50" />

              {glow && (
                <div className="absolute -top-4 -right-4 z-20">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/40 animate-pop">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}

              {input || (
                <span className={`transition-opacity duration-300 ${phase === 'hidden' && isFocused ? 'text-slate-500 animate-pulse' : 'text-slate-700'}`}>
                  {phase === 'hidden' && isFocused ? 'TYPE FAST!' : '...'}
                </span>
              )}

              {/* Hidden Input */}
              <input
                ref={hiddenInputRef}
                className="absolute inset-0 opacity-0 cursor-text"
                value={input}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                readOnly={phase !== 'hidden'}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center">
            {phase === 'hidden' && (
              <div className="text-xs text-slate-500 tracking-widest uppercase font-semibold opacity-60">
                <Keyboard className="w-3 h-3 inline mr-1.5 relative -top-px" />
                Instant Recall
              </div>
            )}
          </div>
        </div>
      )}

      {/* Intro Overlay */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center pb-8 opacity-60">
          <Zap className="w-16 h-16 text-slate-700 mb-4" />
          <p className="text-slate-500 font-mono text-sm max-w-xs text-center leading-relaxed">
            Memorize the displayed word instantly.<br />Type it after it disappears.
          </p>
        </div>
      )}

      {/* Countdown Overlay */}
      {phase === 'countdown' && (countdown != null || showStart) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative">
            {/* Ring Animation */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 animate-ping opacity-20" />
            <div className={`
                 -translate-x-2.5 text-8xl font-black italic tracking-tighter
                 ${showStart ? 'text-emerald-400 scale-110 drop-shadow-[0_0_40px_rgba(52,211,153,0.6)]' : 'text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]'}
                 animate-in zoom-in slide-in-from-bottom-5 duration-300
              `}>
              {showStart ? 'GO!' : countdown}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GameStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col justify-center px-4 py-3 rounded-xl bg-slate-950/30 border border-slate-800/50 backdrop-blur-sm">
      <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5 tracking-wider">{label}</div>
      <div className={`text-xl font-mono font-bold tracking-tight ${color} drop-shadow-sm`}>{value}</div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 flex flex-col items-center text-center">
      <div className="mb-2 p-2 rounded-full bg-slate-900 shadow-inner">{icon}</div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-200 font-mono">{value}</div>
    </div>
  )
}
