import type { SuddenLyricLine, SuddenVideoListItem, SuddenVideoSearchResult } from "../types"

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL ?? "http://localhost:3001"

function buildURL(videoId: string) {
  const url = new URL("/api/sudden-death/captions", API_BASE)
  url.searchParams.set("videoId", videoId)
  return url.toString()
}

export async function fetchSuddenLines(videoId: string): Promise<SuddenLyricLine[]> {
  if (!videoId.trim()) throw new Error("videoId is required")
  const res = await fetch(buildURL(videoId.trim()))
  if (!res.ok) {
    const msg = await res.text().catch(() => "")
    throw new Error(`Failed to fetch captions: ${res.status} ${msg}`)
  }
  return (await res.json()) as SuddenLyricLine[]
}

export async function searchSuddenVideos(query: string): Promise<SuddenVideoSearchResult[]> {
  if (!query.trim()) throw new Error("query is required")
  const url = new URL("/api/sudden-death/search", API_BASE)
  url.searchParams.set("query", query.trim())
  const res = await fetch(url.toString())
  if (!res.ok) {
    const msg = await res.text().catch(() => "")
    throw new Error(`Failed to search videos: ${res.status} ${msg}`)
  }
  return (await res.json()) as SuddenVideoSearchResult[]
}

export async function listSuddenVideos(): Promise<SuddenVideoListItem[]> {
  const url = new URL("/api/sudden-death/list", API_BASE)
  const res = await fetch(url.toString())
  if (!res.ok) {
    const msg = await res.text().catch(() => "")
    throw new Error(`Failed to list videos: ${res.status} ${msg}`)
  }
  return (await res.json()) as SuddenVideoListItem[]
}
