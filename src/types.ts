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

export type SuddenLyricLine = {
  startMs: number
  endMs: number
  text: string
  romaji: string
}

export type SuddenVideoSearchResult = {
  videoId: string
  title: string
  channelTitle: string
  publishedAt?: string | null
  thumbnail?: string | null
  hasLyrics?: boolean
}

export type SuddenVideoListItem = {
  videoId: string
  title: string
  hasLyrics: boolean
}
