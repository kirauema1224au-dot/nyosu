import React, { useEffect, useMemo, useState } from 'react'
import { Trophy, Calendar, Medal, Crown, TrendingUp, AlertCircle, Clock } from 'lucide-react'

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
      <section className="mt-12 p-8 rounded-3xl border border-slate-800/50 bg-slate-900/40 text-center animate-in fade-in duration-700">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700 ring-4 ring-slate-900/50">
            <Trophy className="w-8 h-8 text-slate-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-300 mb-2">Daily Best Records</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          まだ記録がありません。プレイしてあなたの成長を刻みましょう。
        </p>
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
    <section className="mt-16 mb-12 relative animate-in fade-in duration-1000">
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-500/30">
          <Trophy className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 tracking-tight drop-shadow-sm">
            Daily Best Records
          </h2>
          <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">Your Legend</p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {ordered.map((d, idx) => {
          const rank = idx + 1
          const isTop = rank === 1
          const chipColor = colorOf(d.difficulty)

          return (
            <div
              key={d.dateKey}
              className={`
                group relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 rounded-2xl border transition-all duration-500
                ${isTop
                  ? 'bg-gradient-to-r from-slate-900/80 via-amber-950/20 to-slate-900/80 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] hover:border-amber-400/50 hover:shadow-[0_0_50px_rgba(245,158,11,0.2)] scale-[1.02]'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }
                backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Podium/Rank Effect */}
              {isTop && (
                <div className="absolute -left-1 -top-1 w-8 h-8 flex items-center justify-center transform -rotate-12 z-20">
                  <Crown className="w-8 h-8 text-amber-400 fill-amber-400/20 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse-slow" />
                </div>
              )}

              {/* Rank Chip */}
              <div className={`
                flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl font-black text-lg border relative overflow-hidden group-hover:scale-110 transition-transform
                ${isTop
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white border-amber-300 shadow-lg'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
                }
              `}>
                <span className="relative z-10">{rank}</span>
                {isTop && <div className="absolute inset-0 bg-white/30 animate-shimmer" />}
              </div>

              {/* Date & Mode */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-400 text-sm font-mono">
                  <Calendar className="w-3.5 h-3.5 opacity-70" />
                  {formatDateOnly(d.record.startedAt)}
                </div>
                <div className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm
                  ${chipColor.bg} ${chipColor.text}
                `}>
                  {labelOf(d.difficulty)} MODE
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex items-center gap-6 sm:gap-8 px-4 border-l border-r border-slate-800/50 mx-4 sm:mx-0">
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Solved</div>
                  <div className="text-sm font-mono font-bold text-slate-200">{d.solved}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Miss</div>
                  <div className={`text-sm font-mono font-bold ${d.mistakes === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {d.mistakes}
                  </div>
                </div>
              </div>

              {/* Points */}
              <div className="text-right min-w-[120px]">
                <div className="flex flex-col items-end">
                  <div className={`text-3xl font-black font-mono tracking-tighter tabular-nums drop-shadow-sm ${isTop ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-100' : 'text-slate-200'}`}>
                    {d.points}
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 transform -translate-y-1">Points</div>
                </div>
              </div>

              {/* Ambient Hover Light */}
              <div
                className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isTop ? 'bg-amber-500/5' : 'bg-slate-400/5'}`}
              />
            </div>
          )
        })}
      </div>

      {/* Background Ambience */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-b from-slate-900/0 via-amber-900/5 to-slate-900/0 blur-3xl pointer-events-none -z-10" />
    </section>
  )
}

function formatDateOnly(ts: number) {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
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
      return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' }
    case 'normal':
      return { bg: 'bg-cyan-500/10 border-cyan-500/20', text: 'text-cyan-400' }
    case 'hard':
      return { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' }
    default:
      return { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400' }
  }
}
