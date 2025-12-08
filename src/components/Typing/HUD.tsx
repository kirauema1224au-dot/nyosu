import { useTypingStore } from '../../store/useTypingStore'

export function HUD() {
  const sessionActive = useTypingStore((s) => s.sessionActive)
  const stats = useTypingStore((s) => s.sessionStats)
  const sessionDifficulty = useTypingStore((s) => s.sessionDifficulty)
  if (sessionActive) {
    return (
      <div className="flex gap-6 mb-3">
        <Metric label="難易度" value={labelOf(sessionDifficulty)} />
        <Metric label="解いた数" value={String(stats.promptsSolved)} />
        <Metric label="総ミス" value={String(stats.totalMistakes)} />
        <Metric label="時間切れ" value={String(stats.promptsTimedOut)} />
      </div>
    )
  }
  // セッション外はミス回数を表示しない
  return null
}

function labelOf(mode: any) {
  // 実行時は mode が 'easy'|'normal'|'hard'|null
  switch (mode) {
    case 'easy': return 'EASY'
    case 'normal': return 'NORMAL'
    case 'hard': return 'HARD'
    default: return '-'
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[90px]">
      <div className="text-xs text-slate-300">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-slate-100">{value}</div>
    </div>
  )
}
