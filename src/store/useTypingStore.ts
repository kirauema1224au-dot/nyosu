// src/store/useTypingStore.ts
import { create } from "zustand"
import type { Prompt, RoundResult } from "../types"
import { fetchPrompts } from "../api/prompts"
import { validateStrict } from "../lib/typing"
import { computeAccuracy, computeWPM } from "../lib/stats"
import { updateDifficultyTarget } from "../lib/difficulty"

// ランダムに次のお題を1つ選ぶ（現在のお題IDは除外）
function pickRandomPrompt(
  prompts: Prompt[],
  currentId?: number | null
): Prompt | null {
  if (prompts.length === 0) return null

  const candidates =
    currentId != null
      ? prompts.filter((p) => p.id !== currentId)
      : prompts

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
  input: "",
  mistakes: 0,
  startedAt: null,
  finishedAt: null,
  history: [],
}

// ★ ここが大事：export const useTypingStore（名前付きエクスポート）
export const useTypingStore = create<State & Actions>()((set, get) => ({
  ...initialState,

  // API からお題を読み込んで初期化
  init: async () => {
    try {
      const prompts = await fetchPrompts()

      // お題が1件も取れなかった場合のケア
      if (!prompts || prompts.length === 0) {
        set({
          prompts: [],
          current: null,
          input: "",
          mistakes: 0,
          startedAt: null,
          finishedAt: null,
        })
        return
      }

      // 1件以上あればランダムに1つ選ぶ
      const current = pickRandomPrompt(prompts) ?? prompts[0]

      set({
        prompts,
        current,
        input: "",
        mistakes: 0,
        startedAt: null,
        finishedAt: null,
      })
    } catch (error) {
      console.error("init error: failed to load prompts from API", error)
      // エラー時はいったん初期状態に戻す
      set({
        prompts: [],
        current: null,
        input: "",
        mistakes: 0,
        startedAt: null,
        finishedAt: null,
      })
    }
  },

  setInput: (s: string) => {
    const { current, input, mistakes, startedAt } = get()
    if (!current) return

    const prev = input
    const next = s
    const { prefixOK } = validateStrict(next, current.romaji)

    let newMistakes = mistakes
    if (!prefixOK && next.length > prev.length) {
      newMistakes += 1
    }

    set({
      input: next,
      mistakes: newMistakes,
      startedAt: startedAt ?? performance.now(),
    })
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

    const entry: RoundResult = {
      promptId: current.id,
      wpm,
      accuracy,
      timestamp: Date.now(),
    }

    const history = [...get().history, entry].slice(-100)

    set({
      history,
      difficultyTarget: nextTarget,
      finishedAt,
    })

    get().nextPrompt()
  },

  nextPrompt: () => {
    const { prompts, current } = get()
    const next = pickRandomPrompt(prompts, current?.id) ?? null

    set({
      current: next,
      input: "",
      mistakes: 0,
      startedAt: null,
      finishedAt: null,
    })
  },

  skip: () => {
    get().nextPrompt()
  }
})); // <-- ここにカンマとカッコ、セミコロン漏れあり！（修正）
