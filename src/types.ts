export type Prompt = {
  id: number
  text: string
  romaji: string
  difficulty: number
  tags?: string[] | null
  created_at?: string
}

export type RoundResult = {
  promptId: number
  wpm: number
  accuracy: number
  timestamp: number
}

