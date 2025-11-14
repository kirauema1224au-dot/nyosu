import type { Prompt } from '../types'

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// target' = clamp(target + (wpm-45)*4 + (acc-95)*6, 100, 2000)
export function updateDifficultyTarget(currentTarget: number, wpm: number, accuracy: number): number {
  const delta = (wpm - 45) * 4 + (accuracy - 95) * 6
  return clamp(Math.round(currentTarget + delta), 100, 2000)
}

export function pickNextPrompt(prompts: Prompt[], target: number): Prompt | null {
  if (!prompts.length) return null
  // Add a tiny jitter to avoid always picking the same one
  const scored = prompts.map((p) => ({ p, s: Math.abs(p.difficulty - target) + Math.random() * 5 }))
  scored.sort((a, b) => a.s - b.s)
  return scored[0]?.p ?? null
}

