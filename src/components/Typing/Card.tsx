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
  const multiInRoom = useMultiStore((s) => s.isInRoom)
  const multiMode = useMultiStore((s) => s.mode)

  // Local control for when the round actually starts
  const [started, setStarted] = useState(false)
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
      try { window.dispatchEvent(new Event('typing-timeup')) } catch {}
      const el = document.getElementById('typing-input') as HTMLInputElement | null
      el?.blur()
    }
  }, [endSession, init])

  const onPromptTimeUp = useCallback(() => {
    // お題の制限時間切れ: シェイクして次の問題へ
    try { window.dispatchEvent(new Event('typing-timeup')) } catch {}
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

  if (!current) {
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
    <div className="rounded-lg border border-slate-700 glass-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-100">{sessionActive ? '2分チャレンジ' : 'Practice'}</h2>
        <div className="flex items-center gap-2">
          {!sessionActive && status !== "playing" && !(multiInRoom && multiMode === 'practice') && (
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
      <Game prompt={current} status={status} onPromptTimeUp={onPromptTimeUp} onSessionTimeUp={onSessionTimeUp} />
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
