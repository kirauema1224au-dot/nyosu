import { create } from 'zustand'
import type { Prompt, RoundResult } from '../types'
import { fetchPrompts } from '../api/prompts'
import { validateStrict } from '../lib/typing'
import { computeAccuracy, computeWPM } from '../lib/stats'
import { pickNextPrompt, updateDifficultyTarget } from '../lib/difficulty'


// ★ ここから追加 ★
function pickRandomPrompt(prompts: Prompt[], currentId?: number | null): Prompt | null {
  if (prompts.length === 0) return null

  // 現在のIDを除外して候補を作る
  const candidates =
    currentId != null
      ? prompts.filter((p) => p.id !== currentId)
      : prompts

  // もし候補が0なら（お題が1件しかない場合など）全体から選ぶ
  const pool = candidates.length > 0 ? candidates : prompts

  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]
}


type State = {
  prompts: Prompt[]
  current: Prompt | null
  difficultyTarget: number
  input: string
  mistakes: number
  startedAt: number | null
  finishedAt: number | null
  history: RoundResult[]
}

type Actions = {
  init: () => Promise<void>
  setInput: (s: string) => void
  submitIfComplete: () => void
  nextPrompt: () => void
  skip: () => void
}

const initialState: State = {
  prompts: [],
  current: null,
  difficultyTarget: 300,
  input: '',
  mistakes: 0,
  startedAt: null,
  finishedAt: null,
  history: [],
}

export const useTypingStore = create<State & Actions>()((set, get) => ({
    ...initialState,
    init: async () => {
      const prompts = await fetchPrompts()
      // 最初のお題もランダムに
      const current = pickRandomPrompt(prompts) ?? null
      set({
        prompts,
        current,
        input: '',
        mistakes: 0,
        startedAt: performance.now(),
        finishedAt: null,
      })
    },
    
    setInput: (s: string) => {
      const { current, input, mistakes } = get()
      if (!current) return
      const prev = input
      const next = s
      const { prefixOK } = validateStrict(next, current.romaji)
      let newMistakes = mistakes
      if (!prefixOK && next.length > prev.length) {
        newMistakes += 1
      }
      set({ input: next, mistakes: newMistakes, startedAt: get().startedAt ?? performance.now() })
    },
    submitIfComplete: () => {
      const { current, input, mistakes, startedAt, difficultyTarget } = get()
      if (!current || !startedAt) return
      const { completed } = validateStrict(input, current.romaji)
      if (!completed) return
      const finishedAt = performance.now()
      const ms = finishedAt - startedAt
      const wpm = computeWPM(input.length, ms)
      const accuracy = computeAccuracy(input.length, mistakes)
      const nextTarget = updateDifficultyTarget(difficultyTarget, wpm, accuracy)
      const entry: RoundResult = { promptId: current.id, wpm, accuracy, timestamp: Date.now() }
      const history = [...get().history, entry].slice(-100)
      set({ history, difficultyTarget: nextTarget, finishedAt })
      get().nextPrompt()
    },
    nextPrompt: () => {
      const { prompts, current } = get()
      const next = pickRandomPrompt(prompts, current?.id) ?? null
      set({
        current: next,
        input: '',
        mistakes: 0,
        startedAt: performance.now(),
        finishedAt: null,
      })
    },
    
    skip: () => {
      get().nextPrompt()
    },
}))
