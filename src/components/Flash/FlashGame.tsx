import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTypingStore } from '../../store/useTypingStore'
import type { Prompt } from '../../api/prompts'
import { isAcceptedRomaji } from '../../lib/typing'

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

  const inputRef = useRef<HTMLInputElement | null>(null)
  const timers = useRef<number[]>([])

  // 初回ロードでお題を準備
  useEffect(() => { void init() }, [init])

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
    // 3-2-1 countdown
    setPhase('countdown')
    setCountdown(3)
    const t1 = window.setTimeout(() => setCountdown(2), 1000)
    const t2 = window.setTimeout(() => setCountdown(1), 2000)
    const t3 = window.setTimeout(() => {
      setCountdown(null)
      const now = Date.now()
      setSessionEndsAt(now + SESSION_SECONDS * 1000)
      // kick first round
      startRound(nextPrompt())
    }, 3000)
    timers.current.push(t1, t2, t3)
  }

  const endSession = () => {
    if (phase === 'finished') return
    clearTimers()
    setPhase('finished')
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
      // 入力欄にフォーカス
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }, REVEAL_MS)
    timers.current.push(id)
  }

  // セッション残り時間の監視
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    if (!sessionEndsAt) return
    if (now >= sessionEndsAt) endSession()
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

  const onTimeOut = () => {
    // 正解（romaji）を短く表示し、その後に次へ
    if (current) setShowAnswerJP(current.text)
    setPhase('showing-answer')
    setTimeouts((t) => t + 1)
    // ライフ尽きたら終了
    const after = () => {
      if (timeouts + 1 >= MAX_TIMEOUTS) {
        endSession()
      } else {
        startRound(nextPrompt())
      }
    }
    window.setTimeout(after, 800)
  }

  const onChange = (v: string) => {
    setInput(v)
    if (!current) return
    const ok = isAcceptedRomaji(v, current.romaji)
    if (ok) {
      setSolved((s) => s + 1)
      // 成功時は自動で次へ
      startRound(nextPrompt())
    }
  }

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

  const remainingSec = useMemo(() => {
    if (!sessionEndsAt) return 0
    return Math.max(0, Math.ceil((sessionEndsAt - now) / 1000))
  }, [sessionEndsAt, now])

  const perRemaining = useMemo(() => {
    if (!perEndsAt || phase !== 'hidden') return null
    return Math.max(0, Math.ceil((perEndsAt - now) / 1000))
  }, [perEndsAt, phase, now])

  return (
    <div className="rounded-lg border border-slate-700 glass-surface p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-100">瞬間判断タイピング</h2>
        <div className="flex items-center gap-2">
          <button
            className="text-sm px-3 py-1.5 rounded border border-slate-600 bg-slate-800/60 hover:bg-slate-700/60"
            onClick={() => { try { location.hash = '' } catch {} }}
          >
            ← Practice
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded border border-rose-600/70 bg-rose-900/40 text-rose-100 hover:bg-rose-900/60 disabled:opacity-50"
            onClick={() => { clearTimers(); setPhase('idle'); setSessionEndsAt(null); setCurrent(null); setInput(''); setSolved(0); setTimeouts(0); setMistakes(0); setPerEndsAt(null); setShowAnswerJP(null); setCountdown(null) }}
            disabled={phase === 'idle'}
          >
            Reset
          </button>
        </div>
      </div>
      {/* HUD */}
      <div className="flex items-center gap-4 mb-4">
        <div className="min-w-[120px]">
          <div className="text-xs text-slate-300">残り時間</div>
          <div className="text-lg font-semibold tabular-nums timer-heartbeat">{fmt(remainingSec)}</div>
        </div>
        <div className="min-w-[120px]">
          <div className="text-xs text-slate-300">正解数</div>
          <div className="text-lg font-semibold tabular-nums">{solved}</div>
        </div>
        <div className="min-w-[120px]">
          <div className="text-xs text-slate-300">ライフ</div>
          <div className="text-lg font-semibold">{lifeHearts(MAX_TIMEOUTS - timeouts)}</div>
        </div>
        {perRemaining != null && (
          <div className="min-w-[120px]">
            <div className="text-xs text-slate-300">この問題</div>
            <div className={`text-lg font-semibold tabular-nums ${perRemaining <= 3 ? 'text-rose-400' : ''}`}>{perRemaining}s</div>
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <div className="flex items-center justify-center py-8">
          <button className="accent-btn px-5 py-2 rounded text-white" onClick={startSession}>Start 2:00</button>
        </div>
      )}

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

          {/* 入力欄（非表示中のみ活性） */}
          <div className="flex justify-center">
            <input
              ref={inputRef}
              className={`w-full max-w-xl px-3 py-2 rounded border text-slate-900 ${phase==='hidden' ? 'bg-white' : 'bg-slate-100'} ${phase==='showing-answer'?'input-shake':''}`}
              placeholder={phase==='hidden' ? '記憶でローマ字を入力' : ''}
              value={input}
              onChange={(e) => onChange(e.target.value)}
              disabled={phase !== 'hidden'}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && countdown != null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl font-extrabold text-slate-100 timer-heartbeat select-none">{countdown}</div>
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
