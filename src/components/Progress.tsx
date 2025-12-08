import React, { useEffect, useMemo, useState } from 'react'

type SessionRecord = {
  startedAt: number
  endedAt: number
  promptsSolved?: number
  totalMistakes: number
  sessionDifficulty?: 'easy' | 'normal' | 'hard'
  byMode?: { easy: number; normal: number; hard: number }
  promptsTimedOut?: number
  points?: number
}

type DailyBest = {
  dateKey: string // YYYY-MM-DD (local)
  record: SessionRecord
  solved: number // for display
  points: number
  mistakes: number
  timeouts: number
  difficulty: 'easy' | 'normal' | 'hard' | null
}

export function Progress() {
  const [records, setRecords] = useState<SessionRecord[]>([])

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('typing:sessions')
        const arr = raw ? (JSON.parse(raw) as SessionRecord[]) : []
        const sorted = [...arr].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
        setRecords(sorted)
      } catch {
        setRecords([])
      }
    }
    load()
    const onUpdated = () => load()
    window.addEventListener('typing:sessions-updated', onUpdated as EventListener)
    return () => {
      window.removeEventListener('typing:sessions-updated', onUpdated as EventListener)
    }
  }, [])

  const daily = useMemo<DailyBest[]>(() => {
    if (!records.length) return []

    const bestMap = new Map<string, DailyBest>()

    const solvedOf = (r: SessionRecord) => (typeof r.promptsSolved === 'number'
      ? r.promptsSolved
      : ((r.byMode?.easy ?? 0) + (r.byMode?.normal ?? 0) + (r.byMode?.hard ?? 0)))
    const pointsOf = (r: SessionRecord) => {
      if (typeof r.points === 'number') return r.points
      const diff = r.sessionDifficulty ?? inferDifficulty(r.byMode)
      const solved = solvedOf(r)
      const per = diff === 'hard' ? 200 : diff === 'normal' ? 150 : 100
      return solved * per
    }

    const toDateKey = (ts: number) => {
      const d = new Date(ts)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const better = (a: SessionRecord, b: SessionRecord) => {
      const pa = pointsOf(a)
      const pb = pointsOf(b)
      if (pa !== pb) return pa - pb // 高い方が良い
      if (a.totalMistakes !== b.totalMistakes) return b.totalMistakes - a.totalMistakes // 少ない方が良い
      return (b.endedAt ?? 0) - (a.endedAt ?? 0) // より早い終了（小さい）が良い
    }

    for (const r of records) {
      const key = toDateKey(r.startedAt)
      const current = bestMap.get(key)?.record
      if (!current) {
        bestMap.set(key, {
          dateKey: key,
          record: r,
          solved: solvedOf(r),
          points: pointsOf(r),
          mistakes: r.totalMistakes,
          timeouts: r.promptsTimedOut ?? 0,
          difficulty: r.sessionDifficulty ?? inferDifficulty(r.byMode),
        })
      } else {
        // 比較して良い方を残す
        const diff = better(r, current)
        const winner = diff > 0 ? r : current
        if (winner !== current) {
          bestMap.set(key, {
            dateKey: key,
            record: winner,
            solved: solvedOf(winner),
            points: pointsOf(winner),
            mistakes: winner.totalMistakes,
            timeouts: winner.promptsTimedOut ?? 0,
            difficulty: winner.sessionDifficulty ?? inferDifficulty(winner.byMode),
          })
        }
      }
    }

    // 配列化し、日付の新しい順で並べる
    const arr = Array.from(bestMap.values())
    arr.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    return arr
  }, [records])

  if (!daily.length) {
    return (
      <section className="mt-8">
        <h2 className="text-base font-semibold mb-2">上達度（日別ハイスコア）</h2>
        <div className="text-sm text-slate-600">まだ記録がありません。2分チャレンジを開始して結果を記録しましょう。</div>
      </section>
    )
  }

  // 表示順をポイント降順に（同点はミス少→終了早）
  const ordered = [...daily].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes
    return (a.record.endedAt ?? 0) - (b.record.endedAt ?? 0)
  })
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold mb-3 text-slate-100">上達度（日別ハイスコア）</h2>
      <ul className="space-y-2">
        {ordered.map((d, idx) => {
          const rank = idx + 1
          const isTop = rank === 1
          const chipColor = colorOf(d.difficulty)
          return (
            <li
              key={d.dateKey}
              className={`flex items-center justify-between gap-4 rounded-xl border border-slate-700 glass-surface px-4 py-3 hover:shadow-slate-900/40 hover:shadow-elev-1 transition ${isTop ? 'border-amber-300 shadow-glow-gold' : ''}`}
              aria-label={`${formatDateOnly(d.record.startedAt)}: ${d.points} points`}
            >
              {/* Medal badge */}
              <div className="flex items-center gap-3 min-w-[150px]">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${isTop ? 'bg-gradient-to-br from-amber-300 to-yellow-500 border border-yellow-300' : 'bg-gradient-to-br from-slate-500 to-slate-700'}`}>
                  {isTop ? '👑' : String(rank)}
                </div>
                <div className="font-semibold tabular-nums text-slate-100">{formatDateOnly(d.record.startedAt)}</div>
              </div>
              {/* Middle chips */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${chipColor.bg} ${chipColor.text}`}>{labelOf(d.difficulty)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-200 text-xs tabular-nums border border-slate-700">{d.solved} solved</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-200 text-xs tabular-nums border border-slate-700">miss {d.mistakes}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-200 text-xs tabular-nums border border-slate-700">timeout {d.timeouts}</span>
                </div>
              </div>
              {/* Right big points */}
              <div className={`min-w-[96px] text-right tabular-nums ${isTop ? 'text-slate-100 font-extrabold' : 'text-slate-200 font-bold'}`}>
                {d.points} <span className="text-sm align-middle">pts</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function formatDateOnly(ts: number) {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

function inferDifficulty(byMode?: { easy: number; normal: number; hard: number }): 'easy' | 'normal' | 'hard' | null {
  if (!byMode) return null
  const e = byMode.easy ?? 0
  const n = byMode.normal ?? 0
  const h = byMode.hard ?? 0
  const max = Math.max(e, n, h)
  if (n === max) return 'normal'
  if (h === max) return 'hard'
  if (e === max) return 'easy'
  return null
}

function labelOf(mode: 'easy' | 'normal' | 'hard' | null | undefined) {
  switch (mode) {
    case 'easy': return 'EASY'
    case 'normal': return 'NORMAL'
    case 'hard': return 'HARD'
    default: return '-'
  }
}

function colorOf(mode: 'easy' | 'normal' | 'hard' | null | undefined) {
  switch (mode) {
    case 'easy':
      return { bg: 'bg-emerald-200/20 border border-emerald-300/40', text: 'text-emerald-200' }
    case 'normal':
      return { bg: 'bg-sky-200/20 border border-sky-300/40', text: 'text-sky-200' }
    case 'hard':
      return { bg: 'bg-rose-200/20 border border-rose-300/40', text: 'text-rose-200' }
    default:
      return { bg: 'bg-slate-200/20 border border-slate-300/30', text: 'text-slate-200' }
  }
}
