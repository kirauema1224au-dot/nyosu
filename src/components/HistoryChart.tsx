import React from "react"
import { RoundResult } from '../types'

// Placeholder: simple SVG sparkline until Recharts is installed.
// Once recharts is available, replace with a LineChart with dual axes.
export function HistoryChart({ data }: { data: RoundResult[] }) {
  if (!data.length) {
    return <div className="text-sm text-slate-500">No history yet. Finish a few rounds to see your progress.</div>
  }

  const wpmVals = data.map((d) => d.wpm)
  const accVals = data.map((d) => d.accuracy)
  const maxWpm = Math.max(60, ...wpmVals)
  const minWpm = 0
  const maxAcc = 100
  const minAcc = 0
  const width = 560
  const height = 160

  const toX = (i: number) => (i / Math.max(1, data.length - 1)) * (width - 20) + 10
  const toY1 = (wpm: number) => height - 10 - ((wpm - minWpm) / Math.max(1, maxWpm - minWpm)) * (height - 20)
  const toY2 = (acc: number) => height - 10 - ((acc - minAcc) / Math.max(1, maxAcc - minAcc)) * (height - 20)

  const wpmPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY1(d.wpm).toFixed(1)}`)
    .join(' ')
  const accPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY2(d.accuracy).toFixed(1)}`)
    .join(' ')

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="max-w-full">
        <rect x={0} y={0} width={width} height={height} fill="white" />
        <path d={wpmPath} stroke="#10b981" strokeWidth={2} fill="none" />
        <path d={accPath} stroke="#0ea5e9" strokeWidth={2} fill="none" />
        <text x={10} y={12} fontSize={10} fill="#065f46">WPM</text>
        <text x={width - 40} y={12} fontSize={10} fill="#075985">Acc%</text>
      </svg>
    </div>
  )
}
