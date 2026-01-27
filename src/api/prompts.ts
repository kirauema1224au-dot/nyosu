// src/api/prompts.ts

// ★ ここはそのまま使う
export type Prompt = {
  id: number
  text: string
  romaji: string
  difficulty: number
  created_at?: string
}

// ★ seedPrompts の import は削除
// import { seedPrompts } from '../seed/seedPrompts'

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL ?? 'http://localhost:3001'

/**
 * バックエンドからお題一覧を取得（APIのみ／失敗したらエラー）
 */
export async function fetchPrompts(): Promise<Prompt[]> {
  const res = await fetch(`${API_BASE}/api/prompts`)

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(`Failed to fetch prompts: ${res.status} ${msg}`)
  }

  return (await res.json()) as Prompt[]
}

/**
 * 新しいお題を追加する（ここは今までどおりでOK）
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
