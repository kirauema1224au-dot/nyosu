import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTypingStore } from '../../store/useTypingStore'
import type { Prompt } from '../../api/prompts'
import { isAcceptedRomaji, prefixOKVariants } from '../../lib/typing'
import { useMultiStore } from '../../store/useMultiStore'

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
  const perTimeBarRef = useRef<HTMLDivElement | null>(null)
  const [glow, setGlow] = useState(false)
  const [failGlow, setFailGlow] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /iP(ad|hone|od)/.test(navigator.userAgent)
  }, [])

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
    try { hiddenInputRef.current?.focus({ preventScroll: true } as any) } catch {}
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
      try { window.dispatchEvent(new CustomEvent('typing:flash-sessions-updated', { detail: record })) } catch {}
    } catch {}
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
    try { window.dispatchEvent(new Event('typing:flash-timeout')) } catch {}
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
        try { window.dispatchEvent(new Event('typing:flash-mistake')) } catch {}
        return // block invalid key
      }
    }

    setInput(next)
    // 完全一致したらアニメーションを出してから次へ
    if (isAcceptedRomaji(next, current.romaji)) {
      setSolved((s) => s + 1)
      try { window.dispatchEvent(new Event('typing:flash-correct')) } catch {}
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
        try { window.dispatchEvent(new Event('typing:flash-correct')) } catch {}
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
            ;(el as any).focus({ preventScroll: true })
          } else {
            el.focus()
          }
        } catch {}
      })
      timers.current.push(raf2 as unknown as number)
    })
    timers.current.push(raf1 as unknown as number)
    return () => { cancelled = true }
  }, [phase, current])

  if (!prompts.length) {
    return (
      <div className="rounded-lg border border-slate-700 glass-surface p-4 text-sm text-slate-200">
        お題を読み込み中です…（API 稼働中か確認してください）
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="rounded-lg border border-slate-700 glass-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">瞬間判断タイピング（結果）</h2>
          <button
            className="text-sm px-3 py-1.5 rounded border border-slate-600 bg-slate-800/60 hover:bg-slate-700/60"
            onClick={() => { try { location.hash = '' } catch {} }}
          >
            ← Practice に戻る
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-slate-100">
          <Stat label="正解数" value={String(solved)} />
          <Stat label="タイムアウト" value={`${timeouts}/${MAX_TIMEOUTS}`} />
          <Stat label="スコア" value={`${solved * 100} pts`} />
        </div>
        <div className="flex gap-2">
          <button
            className="accent-btn px-4 py-2 rounded"
            onClick={() => { setPhase('idle'); setSessionEndsAt(null); startSession() }}
          >
            もう一度
          </button>
          <button
            className="px-4 py-2 rounded border border-slate-600 bg-slate-800/60 hover:bg-slate-700/60"
            onClick={() => { try { location.hash = '' } catch {} }}
          >
            Practice に戻る
          </button>
        </div>
      </div>
    )
  }

  

  return (
    <div className="rounded-lg border border-slate-700 glass-surface p-4 relative overflow-hidden min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-100">瞬間判断タイピング</h2>
        <div className="flex items-center gap-2">
          {phase === 'idle' && (
            <button
              className="accent-btn px-4 py-2 rounded text-white"
              onClick={() => startSession()}
            >
              Start
            </button>
          )}
          <button
            className="text-sm px-3 py-1.5 rounded border border-rose-600/70 bg-rose-900/40 text-rose-100 hover:bg-rose-900/60 disabled:opacity-50"
            onClick={() => { clearTimers(); setPhase('idle'); setSessionEndsAt(null); setCurrent(null); setInput(''); setSolved(0); setTimeouts(0); setMistakes(0); setPerEndsAt(null); setShowAnswerJP(null); setCountdown(null); setShowStart(false) }}
            disabled={phase === 'idle'}
          >
            Reset
          </button>
        </div>
      </div>
      {/* HUD moved into card header for Card Minimal */}

      <div className="flex flex-wrap items-end gap-4">
        <Stat label="正解数" value={`${solved}`} />
        <Stat label="ミス" value={`${mistakes}`} />
        <Stat label="ライフ" value={lifeHearts(MAX_TIMEOUTS - timeouts)} />
      </div>

      {/* Start はヘッダーに移動（idle 時のみ表示） */}

      {phase !== 'idle' && (
        <div className="py-4">
          {/* お題のリビール（日本語を0.5秒表示） */}
          <div className="h-16 flex items-center justify-center">
            {phase === 'revealing' && current && (
              <div className="text-2xl font-bold text-slate-100 transition-opacity duration-200">{current.text}</div>
            )}
            {phase === 'showing-answer' && showAnswerJP && (
              <div className="text-xl font-semibold text-amber-300">正解: {showAnswerJP}</div>
            )}
          </div>

          {/* 入力表示（Practice風）と hidden input */}
          <div className="flex justify-center">
            <div
              ref={anchorRef}
              className={`relative mx-auto w-full max-w-xl font-mono text-xl whitespace-pre-wrap break-words rounded border ${phase==='hidden' ? 'bg-white' : 'bg-slate-100'} px-3 py-3 leading-relaxed mt-3 text-center ${glow ? 'input-glow-success ring-2 ring-emerald-400' : ''} ${failGlow ? 'input-shake border-rose-600 border-2' : ''}`}
              role="textbox"
              aria-label="お題入力"
              tabIndex={0}
              onClick={() => hiddenInputRef.current?.focus()}
              onFocus={() => hiddenInputRef.current?.focus()}
            >
              {glow && (
                <div className="absolute -top-3 -right-3" aria-hidden>
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 animate-pop"
                    aria-label="お題に完全一致"
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
              {phase === 'hidden' && input.length === 0 && isFocused ? (
                <span className="text-slate-400 select-none">スタート！</span>
              ) : (
                <span className="text-slate-900">{input || ' '}</span>
              )}
              <input
                ref={hiddenInputRef}
                className="absolute left-0 top-0 h-0 w-0 opacity-0"
                value={input}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                readOnly={phase !== 'hidden'}
                aria-disabled={phase !== 'hidden'}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && (countdown != null || showStart) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="text-6xl font-extrabold timer-heartbeat select-none text-cyan-300 drop-shadow-[0_0_12px_rgba(34,230,255,0.45)]">
            {showStart ? 'START' : countdown}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px]">
      <div className="text-xs text-slate-300">{label}</div>
      <div className="text-lg font-semibold text-slate-100 tabular-nums">{value}</div>
    </div>
  )
}

function fmt(sec: number) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function lifeHearts(n: number) {
  return '❤︎'.repeat(Math.max(0, n))
}
