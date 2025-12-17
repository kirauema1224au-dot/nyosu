import React, { useCallback, useEffect, useRef, useState } from "react"
import { HUD } from './HUD'
import { PromptView } from './PromptView'
import { useTypingStore } from '../../store/useTypingStore'
import { Game } from "../Game"
import { Button } from "../ui/Button"
import { useToast } from "../ui/Toast"
import { useMultiStore } from "../../store/useMultiStore"

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
      <div className="rounded-lg border border-slate-700 glass-surface p-4 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-100">Practice</h2>
          <Button onClick={() => void init()}>Load Prompts</Button>
        </div>
        <p className="text-sm text-slate-300">Click Load to initialize prompts.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-700 glass-surface p-4 min-h-[500px] flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-100">{sessionActive ? '2分チャレンジ' : 'Practice'}</h2>
        <div className="flex items-center gap-3">
          {/* Difficulty segmented control (single-player) */}
          <div
            role="radiogroup"
            aria-label="Practice difficulty"
            className={`inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-900/60 p-1 shadow-sm backdrop-blur-sm ${sessionActive ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {(['easy', 'normal', 'hard'] as const).map((d) => {
              const isActive = timeMode === d
              const activeClass = d === 'hard'
                ? 'bg-rose-500 text-white border-rose-400 focus:ring-rose-500/30'
                : d === 'normal'
                  ? 'bg-emerald-500 text-white border-emerald-400 focus:ring-emerald-500/30'
                  : 'bg-sky-500 text-white border-sky-400 focus:ring-sky-500/30'
              return (
                <button
                  key={d}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setTimeMode(d)}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold uppercase border transition-colors focus:outline-none focus:ring-2 ${isActive ? activeClass : 'text-slate-300 border-transparent hover:bg-slate-800/40 focus:ring-slate-400/20'}`}
                >
                  {d}
                </button>
              )
            })}
          </div>
          {!sessionActive && status !== "playing" && !multiInRoom && (
            <Button pill onClick={() => {
              hasStartedOnceRef.current = true
              setStarted(true)
              // Start押下で2分セッション開始
              startSession(120)
              // Start押下の瞬間に入力欄の内容をクリア
              setInput("")
              // Start直後に入力欄へフォーカス
              const el = document.getElementById('typing-input') as HTMLInputElement | null
              el?.focus()
              show({ title: 'Start', message: '2分チャレンジを開始しました', variant: 'success' })
            }}
              aria-label="Start round"
            >
              <span className="mr-1">🚀</span>Start
            </Button>
          )}
          {/* Start 2:00 ボタンは廃止 */}
          <Button variant="secondary" onClick={() => { handleReset(); show({ title: 'Reset', message: 'セッションをリセットしました' }) }}>Reset</Button>
        </div>
      </div>
      {/* タイマー */}
      <HUD />
                <Game
                  prompt={current}
                  status={status}
                  onPromptTimeUp={onPromptTimeUp}
                  onSessionTimeUp={onSessionTimeUp}
                />
                <PromptView />
      {/* セッション結果の簡易表示（終了後に表示） */}
      {!sessionActive && sessionStats && (sessionStats.promptsSolved > 0 || sessionStats.totalMistakes > 0) && (
        <div className="mt-4 p-3 rounded border border-slate-700 bg-slate-800/50 text-slate-200">
          <div className="text-sm font-semibold mb-1 text-slate-100">直近セッション結果</div>
          <div className="text-sm">難易度: {labelOf(sessionDifficulty)}</div>
          <div className="text-sm">解いた数: {sessionStats.promptsSolved}</div>
          <div className="text-sm">ポイント: {sessionStats.points} pts</div>
          <div className="text-sm">総ミス: {sessionStats.totalMistakes}</div>
          <div className="text-sm">時間切れ: {sessionStats.promptsTimedOut}</div>
        </div>
      )}

      {/* Multi Pre-start Overlay */}
      {status === 'idle' && multiInRoom && !useMultiStore.getState().started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-40 animate-fade-in">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-widest">MULTIPLAYER LOBBY</h2>
              <p className="text-slate-300 text-sm">Waiting for players...</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-2 font-mono">ROOM ID: {useMultiStore.getState().room?.roomId}</p>
              <div className="text-sm font-bold text-emerald-400">
                {Object.keys(useMultiStore.getState().room?.players || {}).length} Players Ready
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => useMultiStore.getState().startGame('practice')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105"
              >
                START MATCH
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Host Controls</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function labelOf(mode: any) {
  switch (mode) {
    case 'easy': return 'EASY'
    case 'normal': return 'NORMAL'
    case 'hard': return 'HARD'
    default: return '-'
  }
}
