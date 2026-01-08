import React, { useCallback, useEffect, useRef, useState } from "react"
import { HUD } from './HUD'
import { PromptView } from './PromptView'
import { useTypingStore } from '../../store/useTypingStore'
import { Game } from "../Game"
import { Button } from "../ui/Button"
import { useToast } from "../ui/Toast"
import { useMultiStore } from "../../store/useMultiStore"
import { Shield, Timer, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react"

export function TypingCard() {
  const current = useTypingStore((s) => s.current)
  const init = useTypingStore((s) => s.init)
  const skip = useTypingStore((s) => s.skip)
  const setInput = useTypingStore((s) => s.setInput)
  const finishedAt = useTypingStore((s) => s.finishedAt)
  const sessionActive = useTypingStore((s) => s.sessionActive)
  const startSession = useTypingStore((s) => s.startSession)
  const endSession = useTypingStore((s) => s.endSession)
  const sessionStats = useTypingStore((s) => s.sessionStats)
  const sessionDifficulty = useTypingStore((s) => s.sessionDifficulty)
  const timeUpPrompt = useTypingStore((s) => s.timeUpPrompt)
  const timeMode = useTypingStore((s) => s.timeMode)
  const setTimeMode = useTypingStore((s) => s.setTimeMode)
  const multiInRoom = useMultiStore((s) => s.isInRoom)
  const multiMode = useMultiStore((s) => s.mode)
  const multiStarted = useMultiStore((s) => s.started)

  // Local control for when the round actually starts
  const [started, setStarted] = useState(false)

  // Listen for multi start signal
  // Sync local started state with sessionActive (triggered by MultiOverlay or local start)
  useEffect(() => {
    if (sessionActive && !started) {
      hasStartedOnceRef.current = true
      setStarted(true)
      setInput("")
      const el = document.getElementById('typing-input') as HTMLInputElement | null
      el?.focus()
    }
  }, [sessionActive, started, setInput])

  // Reset session on mount if entering as multiplayer to ensure clean slate
  useEffect(() => {
    if (multiInRoom) {
      endSession()
      setStarted(false)
      setInput('')
    }
  }, [multiInRoom, endSession, setInput])

  const prevPromptIdRef = useRef<number | null>(null)
  const suppressAutoStartOnceRef = useRef(false)
  const hasStartedOnceRef = useRef(false)

  const status: "idle" | "playing" | "finished" = !current
    ? "idle"
    : finishedAt
      ? "finished"
      : started
        ? "playing"
        : "idle"

  // Resetボタンと2分タイムアップ時の共通処理
  const handleReset = useCallback((opts?: { fromTimeout?: boolean }) => {
    const fromTimeout = !!opts?.fromTimeout
    // セッションを終了（記録保存）
    endSession()
    // 次のお題読み込みなど初期化
    setStarted(false)
    suppressAutoStartOnceRef.current = true
    hasStartedOnceRef.current = false
    void init()
    // タイムアップ由来の場合は視覚効果とフォーカス解除
    if (fromTimeout) {
      try { window.dispatchEvent(new Event('typing-timeup')) } catch { }
      const el = document.getElementById('typing-input') as HTMLInputElement | null
      el?.blur()
    }
  }, [endSession, init])

  const onPromptTimeUp = useCallback(() => {
    // お題の制限時間切れ: シェイクして次の問題へ
    try { window.dispatchEvent(new Event('typing-timeup')) } catch { }
    timeUpPrompt()
  }, [timeUpPrompt])

  const onSessionTimeUp = useCallback(() => {
    // セッション（2分）切れ: Reset処理を自動実行
    handleReset({ fromTimeout: true })
  }, [handleReset])

  // Auto-start when moving to a new prompt (only after Start pressed once; suppressed after Reset)
  useEffect(() => {
    const currentId = current?.id ?? null
    const prevId = prevPromptIdRef.current
    prevPromptIdRef.current = currentId

    // No prompt loaded yet
    if (currentId == null) {
      setStarted(false)
      return
    }

    // Suppress once (e.g., after Reset)
    if (suppressAutoStartOnceRef.current) {
      suppressAutoStartOnceRef.current = false
      setStarted(false)
      return
    }

    // If there was a previous prompt and it changed, auto-start countdown
    if (hasStartedOnceRef.current && prevId != null && prevId !== currentId) {
      setStarted(true)
      const el = document.getElementById('typing-input') as HTMLInputElement | null
      el?.focus()
      return
    }

    // First load: do not auto-start
    setStarted(false)
  }, [current])

  // Ensure initial data is loaded
  const { show } = useToast()

  if (!current && !sessionActive) {
    return (
      <div className="rounded-2xl border border-slate-700/50 glass-surface p-8 text-center space-y-4 animate-in fade-in">
        <div className="flex flex-col items-center justify-center gap-3">
          <Shield className="w-8 h-8 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-200 tracking-wide">PRACTICE MODE</h2>
        </div>
        <Button onClick={() => void init()} className="px-8 shadow-lg shadow-emerald-900/20">Load Prompts</Button>
      </div>
    )
  }

  return (
    <div className="relative rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-8 overflow-hidden min-h-[500px] flex flex-col shadow-2xl transition-all duration-500 group">
      {/* Ambient Glow */}
      <div className={`absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none transition-opacity duration-1000 ${sessionActive ? 'opacity-40 animate-pulse-slow' : 'opacity-20'}`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wider text-slate-100 drop-shadow-sm">
              TYPING <span className="text-emerald-500 font-extrabold italic">PRACTICE</span> {/* Premium Header */}
              {sessionActive && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse not-italic font-sans align-middle">ACTIVE</span>}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Difficulty segmented control */}
          <div
            role="radiogroup"
            aria-label="Practice difficulty"
            className={`flex p-1 rounded-xl bg-slate-950/40 border border-slate-800/60 backdrop-blur-md shadow-inner ${sessionActive ? 'opacity-50 pointer-events-none grayscale' : ''}`}
          >
            {(['easy', 'normal', 'hard'] as const).map((d) => {
              const isActive = timeMode === d
              const activeClass = d === 'hard'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                : d === 'normal'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]'
              return (
                <button
                  key={d}
                  onClick={() => setTimeMode(d)}
                  className={`
                    relative px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-300
                    ${isActive ? `${activeClass}` : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}
                  `}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {!sessionActive && status !== "playing" && !multiInRoom && (
            <button
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/20 transform hover:scale-105 transition-all text-sm uppercase tracking-wide flex items-center gap-2"
              onClick={() => {
                hasStartedOnceRef.current = true
                setStarted(true)
                startSession(120)
                setInput("")
                const el = document.getElementById('typing-input') as HTMLInputElement | null
                el?.focus()
                show({ title: 'Start', message: '2分チャレンジを開始しました', variant: 'success' })
              }}
            >
              Start
            </button>
          )}

          <button
            className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/50 transition-all active:scale-95"
            onClick={() => { handleReset(); show({ title: 'Reset', message: 'セッションをリセットしました' }) }}
            title="Reset Session"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New HUD Layout */}
      {sessionActive && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 mb-8 animate-in slide-in-from-top-4 duration-500">
          <StatCard label="SOLVED" value={sessionStats.promptsSolved} icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />} />
          <StatCard label="POINTS" value={sessionStats.points} icon={<TrendingUp className="w-3 h-3 text-amber-400" />} />
          <StatCard label="MISS" value={sessionStats.totalMistakes} icon={<AlertTriangle className="w-3 h-3 text-rose-400" />} />
          <StatCard label="TIME" value={sessionStats.promptsTimedOut} icon={<Timer className="w-3 h-3 text-sky-400" />} labelSuffix="(OUT)" />
        </div>
      )}

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col justify-center relative z-10">
        <Game
          prompt={current}
          status={status}
          onPromptTimeUp={onPromptTimeUp}
          onSessionTimeUp={onSessionTimeUp}
        />
        <div className="mt-8">
          <PromptView />
        </div>
      </div>

      {/* Legacy Session Result Summary (kept for logic, but styled) */}
      {!sessionActive && sessionStats && (sessionStats.promptsSolved > 0 || sessionStats.totalMistakes > 0) && (
        <div className="mt-8 mx-auto w-full max-w-lg p-6 rounded-2xl border border-slate-700/50 bg-slate-800/40 text-center animate-in zoom-in duration-300">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Last Session Report</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-black text-emerald-400 font-mono">{sessionStats.promptsSolved}</div>
              <div className="text-[10px] text-slate-500 uppercase">Solved</div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-400 font-mono">{sessionStats.points}</div>
              <div className="text-[10px] text-slate-500 uppercase">Points</div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-400 font-mono">{sessionStats.totalMistakes}</div>
              <div className="text-[10px] text-slate-500 uppercase">Miss</div>
            </div>
          </div>
        </div>
      )}

      {/* Multi Pre-start Overlay (Styled) */}
      {status === 'idle' && multiInRoom && !useMultiStore.getState().started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-40 animate-fade-in">
          <div className="text-center space-y-8 relative z-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tracking-widest drop-shadow-sm">LOBBY</h2>
              <p className="text-emerald-500/70 font-mono text-xs tracking-[0.2em] uppercase">Waiting for players</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-emerald-500/20 shadow-xl backdrop-blur-md min-w-[300px]">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-emerald-500/10">
                <span className="text-xs text-slate-500 font-mono">ROOM ID</span>
                <span className="text-xs text-emerald-400 font-mono font-bold tracking-widest">{useMultiStore.getState().room?.roomId}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="text-4xl font-black text-white drop-shadow-md">
                  {Object.keys(useMultiStore.getState().room?.players || {}).length}
                </div>
                <div className="text-[10px] uppercase text-emerald-500 font-bold tracking-widest">Players Ready</div>
              </div>
            </div>

            <button
              onClick={() => useMultiStore.getState().startGame('practice')}
              className="group relative px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105"
            >
              <span className="relative z-10 tracking-widest">START MATCH</span>
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 blur-lg transition-opacity" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function StatCard({ label, value, icon, labelSuffix }: { label: string; value: string | number; icon: React.ReactNode, labelSuffix?: string }) {
  return (
    <div className="flex flex-col justify-center px-4 py-3 rounded-xl bg-slate-950/30 border border-slate-800/50 backdrop-blur-sm group hover:border-emerald-500/20 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500">{icon}</div>
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            {label} <span className="opacity-50 text-[9px]">{labelSuffix}</span>
          </div>
        </div>
      </div>
      <div className="text-xl font-mono font-bold tracking-tight text-slate-200 drop-shadow-sm pl-1">{value}</div>
    </div>
  )
}
