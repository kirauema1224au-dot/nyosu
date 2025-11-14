// src/api/prompts.ts
import { seedPrompts } from '../seed/seedPrompts'

export type Prompt = {
  id: number
  text: string
  romaji: string
  difficulty: number
  created_at?: string
}

const API_BASE = 'http://localhost:3001'

/**
 * バックエンドからお題一覧を取得（失敗したら seed にフォールバック）
 */
export async function fetchPrompts(): Promise<Prompt[]> {
  try {
    const res = await fetch(`${API_BASE}/api/prompts`)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return (await res.json()) as Prompt[]
  } catch (error) {
    console.error('fetchPrompts error, falling back to seedPrompts', error)
    return seedPrompts as Prompt[]
  }
}

/**
 * 新しいお題を追加する
 */
export async function createPrompt(input: {
  text: string
  romaji: string
  difficulty: number
}): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/api/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(`Failed to create prompt: ${res.status} ${msg}`)
  }

  return (await res.json()) as Prompt
}
