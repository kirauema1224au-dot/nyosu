import { useTypingStore } from '../../store/useTypingStore'

export function HUD() {
  const mistakes = useTypingStore((s) => s.mistakes)
  return (
    <div className="flex gap-6 mb-3">
      <Metric label="ミス回数" value={mistakes.toString()} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[90px]">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
