import React from 'react'
import { Swords, Zap, Shield, Sparkles } from 'lucide-react'

type Mode = {
  id: string
  label: string
  desc: string
  color: string // Tailwind color class prefix e.g. 'emerald' -> emerald-500
  disabled?: boolean
  Icon: React.ElementType
}

const MODES: Mode[] = [
  {
    id: 'practice',
    label: 'PRACTICE',
    desc: '標準的なタイピング練習',
    color: 'emerald',
    Icon: Shield,
  },
  {
    id: 'flash',
    label: 'FLASH',
    desc: '瞬間判断タイピング',
    color: 'amber',
    Icon: Zap,
  },
  {
    id: 'multi',
    label: 'MULTIPLAYER',
    desc: 'リアルタイム対戦\n(Beta)',
    color: 'sky',
    Icon: Swords,
  },
  {
    id: 'sudden-death',
    label: 'BEAT TYPE RUSH',
    desc: 'ビートに合わせて撃ち抜く\nYouTube歌詞タイピング',
    color: 'rose',
    Icon: Sparkles,
  },
]

export function GameSelector() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-12 tracking-wider filter drop-shadow-lg">
        GAME MODE SELECT
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full px-4">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              if (mode.disabled) return
              window.location.hash = mode.id
            }}
            disabled={mode.disabled}
            className={`
              group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40 p-6 text-left transition-all duration-300
              ${mode.disabled
                ? 'opacity-50 cursor-not-allowed grayscale'
                : 'hover:bg-slate-800/80 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-900/20 hover:border-slate-500'
              }
            `}
          >
            {/* Hover Glow Effect */}
            {!mode.disabled && (
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-${mode.color}-400 blur-xl`} />
            )}

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-2xl font-bold tracking-widest font-mono group-hover:text-${mode.color}-400 transition-colors text-slate-100`}>
                    {mode.label}
                  </span>
                </div>
                <p className="text-sm text-slate-400 whitespace-pre-wrap font-medium">
                  {mode.desc}
                </p>
              </div>

              {/* Icon */}
              <mode.Icon
                className={`w-12 h-12 ml-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 text-${mode.color}-400 opacity-80 group-hover:opacity-100 drop-shadow-lg`}
                strokeWidth={1.5}
              />
            </div>

            {/* Decorative bar */}
            <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-${mode.color}-500/0 via-${mode.color}-500/50 to-${mode.color}-500/0 opacity-0 group-hover:opacity-100 transition-opacity`} />
          </button>
        ))}
      </div>
    </div>
  )
}
