import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fetchSuddenLines, searchSuddenVideos, listSuddenVideos } from "../../api/suddenDeath"
import type { SuddenLyricLine, SuddenVideoSearchResult, SuddenVideoListItem } from "../../types"
import { isAcceptedRomaji, prefixOKVariants, splitForHighlight } from "../../lib/typing"
import { Button } from "../ui/Button"
import { AlertTriangle, CheckCircle2, Loader2, Pause, Play, Skull, Volume2, VolumeX, Zap } from "lucide-react"

type Phase = "idle" | "loading" | "ready" | "waiting" | "playing" | "cleared" | "dead"

const isValidVideoId = (id: string) => /^[A-Za-z0-9_-]{6,}$/.test(id.trim())

export function SuddenDeathGame() {
  const [videoId, setVideoId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SuddenVideoSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [seedList, setSeedList] = useState<SuddenVideoListItem[]>([])
  const [ytReady, setYtReady] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [offsetMs, setOffsetMs] = useState(0)
  const [lines, setLines] = useState<SuddenLyricLine[]>([])
  const [phase, setPhase] = useState<Phase>("idle")
  const [currentIdx, setCurrentIdx] = useState(0)
  const [input, setInput] = useState("")
  const [mistakes, setMistakes] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [solvedCount, setSolvedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const playerRef = useRef<any>(null)
  const [shake, setShake] = useState(false)
  const lineSectionRef = useRef<HTMLDivElement | null>(null)
  const manualStartedRef = useRef(false)

  const currentLine = lines[currentIdx] ?? null

  const firstLineStartMs = useMemo(() => {
    if (!lines.length) return 0
    return Math.min(...lines.map((l) => l.startMs))
  }, [lines])

  useEffect(() => {
    if (!lineSectionRef.current) return
    if (phase === "ready" || phase === "waiting" || phase === "playing") {
      try {
        lineSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      } catch {
        lineSectionRef.current.scrollIntoView()
      }
    }
  }, [phase])

  useEffect(() => {
    if ((window as any).YT?.Player) {
      setYtReady(true)
      return
    }
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    const onReady = () => setYtReady(true)
    ;(window as any).onYouTubeIframeAPIReady = onReady
    document.body.appendChild(tag)
    return () => {
      if ((window as any).onYouTubeIframeAPIReady === onReady) {
        ;(window as any).onYouTubeIframeAPIReady = undefined
      }
    }
  }, [])

  useEffect(() => {
    if (!ytReady || !videoId) return
    if (!isValidVideoId(videoId)) {
      setError("動画IDが不正です")
      return
    }
    const YT = (window as any).YT
    if (!playerRef.current) {
      playerRef.current = new YT.Player("sudden-player", {
        videoId,
        playerVars: { modestbranding: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            setPlayerReady(true)
            try {
              e.target.setVolume(volume * 100)
              setDuration(e.target.getDuration?.() || 0)
            } catch { }
          },
          onStateChange: (e: any) => {
            const state = e.data
            if (state === 1) {
              setIsPlaying(true)
              if (!manualStartedRef.current && lines.length > 0 && phase !== "playing") {
                manualStartedRef.current = true
                resetState()
                setPhase("waiting")
              }
            }
            if (state === 2) setIsPlaying(false)
          },
        },
      })
    } else {
      try {
        playerRef.current.loadVideoById(videoId)
        setDuration(playerRef.current.getDuration?.() || 0)
        playerRef.current.setVolume(volume * 100)
        setIsPlaying(false)
        setCurrentTime(0)
      } catch { }
    }
    return () => {
      try { playerRef.current?.destroy() } catch { }
      playerRef.current = null
    }
  }, [ytReady, videoId, volume])

  useEffect(() => {
    if (!playerRef.current) return
    let raf: number
    const tick = () => {
      try {
        const t = playerRef.current.getCurrentTime?.() || 0
        const d = playerRef.current.getDuration?.() || 0
        setCurrentTime(t)
        setDuration(d)
        const adjusted = t * 1000 + offsetMs
        if (phase === "waiting" && lines.length > 0 && adjusted >= firstLineStartMs) {
          setPhase("playing")
          setCurrentIdx(0)
          setInput("")
          // wait: when first line is reached, switch to playing
        }
        if (phase === "playing" && lines.length > 0) {
          const idx = lines.findIndex((l) => adjusted >= l.startMs && adjusted < l.endMs)
          if (idx >= 0 && idx !== currentIdx) {
            setCurrentIdx(idx)
            setInput("")
          }
          if (adjusted >= lines[lines.length - 1].endMs) setPhase("cleared")
        } else if (phase === "waiting" && lines.length > 0 && adjusted > lines[lines.length - 1].endMs) {
          // 再生が進みすぎている場合はクリア扱いにして止める
          setPhase("cleared")
        }
      } catch { }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, lines, currentIdx, offsetMs, firstLineStartMs])

  const highlight = useMemo(() => {
    if (!currentLine) return null
    return splitForHighlight(input, currentLine.romaji)
  }, [currentLine, input])

  const handleSkipLine = useCallback(() => {
    if (phase !== "playing" && phase !== "waiting") return
    if (!lines.length) return
    const nextIdx = currentIdx + 1
    setInput("")
    if (nextIdx >= lines.length) {
      setPhase("cleared")
    } else {
      setCurrentIdx(nextIdx)
    }
  }, [phase, lines, currentIdx])

  const lineProgress = useMemo(() => {
    if (!currentLine) return 0
    const span = currentLine.endMs - currentLine.startMs
    if (span <= 0) return 1
    const adjusted = currentTime * 1000 + offsetMs
    if (adjusted < currentLine.startMs) return 0
    const t = (adjusted - currentLine.startMs) / span
    return Math.min(1, Math.max(0, t))
  }, [currentLine, currentTime, offsetMs])

  const lineStartSec = currentLine ? currentLine.startMs / 1000 : 0
  const lineEndSec = currentLine ? currentLine.endMs / 1000 : 0

  // 行タイマーが100%に達したら自動で次行へ（waiting 中でも進める）
  useEffect(() => {
    if (!currentLine) return
    if ((phase === "playing" || phase === "waiting") && lineProgress >= 1) {
      if (phase === "waiting") setPhase("playing")
      handleSkipLine()
    }
  }, [phase, currentLine, lineProgress, handleSkipLine])

  const handleReset = useCallback(() => {
    if (!lines.length) return
    resetState()
    setPhase("ready")
    setCurrentIdx(0)
    setInput("")
    setMistakes(0)
    setSolvedCount(0)
    setError(null)
    try {
      playerRef.current?.pauseVideo()
      playerRef.current?.seekTo(0, true)
      setIsPlaying(false)
      setCurrentTime(0)
    } catch { }
  }, [lines])

  const resetState = (opts?: { clearLines?: boolean }) => {
    if (opts?.clearLines) setLines([])
    setCurrentIdx(0)
    setInput("")
    setMistakes(0)
    setSolvedCount(0)
    setError(null)
    manualStartedRef.current = false
  }

  const handleFetch = async () => {
    if (!isValidVideoId(videoId)) {
      setError("動画IDが不正です")
      return
    }
    resetState({ clearLines: true })
    setPhase("loading")
    try {
      const data = await fetchSuddenLines(videoId)
      if (!Array.isArray(data) || data.length === 0) throw new Error("歌詞（字幕）が空です")
      setLines(data)
      setPhase("waiting")
      manualStartedRef.current = false
    } catch (e: any) {
      setError(e?.message ?? "取得に失敗しました")
      setPhase("idle")
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchError(null)
    try {
      const results = await searchSuddenVideos(searchQuery)
      const filtered = results.filter((r) => r.hasLyrics !== false)
      setSearchResults(filtered)
      if (filtered.length === 0) {
        setSearchError("このキーワードで歌詞付きの動画は見つかりませんでした")
      }
    } catch (e: any) {
      setSearchError(e?.message ?? "検索に失敗しました")
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    listSuddenVideos()
      .then((data) => setSeedList(data.filter((d) => d.hasLyrics)))
      .catch(() => { /* 無視 */ })
  }, [])

  const handlePickVideo = (id: string) => {
    setVideoId(id)
    setError(null)
    setPhase("idle")
    setPlayerReady(false)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }

  const togglePlay = () => {
    if (!playerRef.current) return
    try {
      if (isPlaying) playerRef.current.pauseVideo()
      else playerRef.current.playVideo()
    } catch { }
  }

  const handleSeek = (ratio: number) => {
    if (!playerRef.current || !duration) return
    const clamped = Math.min(1, Math.max(0, ratio))
    const target = duration * clamped
    try { playerRef.current.seekTo(target, true) } catch { }
  }

  const handleVolume = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setVolume(clamped)
    try { playerRef.current?.setVolume(clamped * 100) } catch { }
  }

  const startRun = useCallback(() => {
    if (!lines.length) return
    if (!playerReady || !playerRef.current) {
      setError("プレイヤーの準備中です。数秒後にもう一度 Start を押してください。")
      return
    }
    resetState()
    setLines(lines)
    setPhase("waiting")
    try {
      // ユーザー操作直後に確実に再生を試みる（autoplay 制限回避のため unMute -> playVideo を連続で呼ぶ）
      try { playerRef.current?.unMute?.() } catch { }
      playerRef.current?.playVideo()
      setTimeout(() => {
        try {
          playerRef.current?.playVideo()
        } catch { }
      }, 150)
      // Start ボタン押下時だけ入力を受け付けられるようにフォーカス
      try { inputRef.current?.focus({ preventScroll: true }) } catch { }
    } catch { }
  }, [firstLineStartMs, lines, playerReady])

  const handleSolved = () => {
    const nextIdx = currentIdx + 1
    setSolvedCount((c) => c + 1)
    setInput("")
    if (nextIdx >= lines.length) {
      setPhase("cleared")
    } else {
      setCurrentIdx(nextIdx)
    }
  }

  const handleInput = (val: string) => {
    if (!currentLine) return
    const sanitized = val.replace(/[^a-zA-Z'\s]/g, "")
    if (phase !== "playing") {
      setInput(sanitized)
      return
    }
    const isDeleting = sanitized.length < input.length
    if (!isDeleting && !prefixOKVariants(sanitized, currentLine.romaji)) {
      setMistakes((m) => m + 1)
      setShake(true)
      setTimeout(() => setShake(false), 200)
      return
    }
    setInput(sanitized)
    if (isAcceptedRomaji(sanitized, currentLine.romaji)) handleSolved()
  }

  const statusTag = (() => {
    switch (phase) {
      case "waiting": return { text: "READY...WAITING", color: "bg-amber-500/20 text-amber-100 border-amber-500/40" }
      case "playing": return { text: "BEAT TYPE RUSH", color: "bg-rose-500/20 text-rose-200 border-rose-500/40" }
      case "ready": return { text: "READY", color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" }
      case "cleared": return { text: "CLEARED", color: "bg-sky-500/20 text-sky-200 border-sky-500/40" }
      case "dead": return { text: "FAILED", color: "bg-amber-500/20 text-amber-100 border-amber-500/40" }
      default: return { text: "IDLE", color: "bg-slate-700/30 text-slate-200 border-slate-600/50" }
    }
  })()

  useEffect(() => {
    if (phase !== "playing" && phase !== "waiting") return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        if (phase === "waiting") {
          const startSec = firstLineStartMs / 1000
          try {
            playerRef.current?.playVideo()
            if (Number.isFinite(startSec)) {
              playerRef.current?.seekTo(startSec, true)
              setCurrentTime(startSec)
            }
          } catch { }
          setPhase("playing")
          setCurrentIdx(0)
          setInput("")
          return
        }
        handleSkipLine()
      }
      if (phase === "playing" && e.code === "Escape") {
        e.preventDefault()
        handleSkipLine()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, handleSkipLine, firstLineStartMs])

  const formatTime = (t: number) => {
    if (!Number.isFinite(t)) return "0:00"
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const currentRatio = duration ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 shadow-inner">
            <Zap className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-widest text-slate-50">BEAT TYPE RUSH</h2>
            <p className="text-xs text-slate-400">字幕から歌詞を引いて、ローマ字で撃ち抜く</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusTag.color}`}>
          {statusTag.text}
        </span>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-4 md:p-6 shadow-2xl space-y-4">
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black">
          <div id="sudden-player" className="w-full h-full" />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                <span className="font-semibold text-slate-200">Space</span> イントロスキップ
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                <span className="font-semibold text-slate-200">Space / Esc</span> 行スキップ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleReset} disabled={!lines.length}>
                リセット
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div ref={lineSectionRef} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:p-6 shadow-2xl space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 space-y-4">
          {(phase === "playing" || phase === "ready" || phase === "waiting") && currentLine && (
            <div className="space-y-3" onClick={() => inputRef.current?.focus()} role="presentation">
              <p className="text-sm text-slate-400">歌詞原文</p>
              <div className="text-2xl md:text-3xl font-bold text-slate-50 leading-tight break-words whitespace-pre-wrap">{currentLine.text}</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>ラインタイマー</span>
                  <span className="font-mono text-slate-300">{(lineProgress * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">{formatTime(lineStartSec)}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-rose-500 transition-[width] duration-100 ease-linear"
                      style={{ width: `${lineProgress * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{formatTime(lineEndSec)}</span>
                </div>
              </div>
              <div className={`rounded-xl border px-3 py-3 font-mono text-base md:text-lg text-slate-200 break-words whitespace-pre-wrap ${shake ? "border-rose-500 animate-[shake_0.2s_ease-in-out] bg-slate-950/70" : "border-slate-800 bg-slate-950/70"}`}>
                {highlight ? (
                  <span>
                    <span className="text-emerald-300">{highlight.correct}</span>
                    <span className={highlight.isMistake ? "bg-rose-600/60 text-white px-1 rounded" : "text-slate-400"}>{highlight.next}</span>
                    <span className="text-slate-500">{highlight.rest}</span>
                  </span>
                ) : (
                  currentLine.romaji
                )}
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                className="sr-only"
                aria-label="ローマ字入力"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <p className="text-xs text-slate-500">スペースでイントロスキップ / スペース・Escで行スキップ</p>
            </div>
          )}

          {phase === "cleared" && (
            <div className="flex flex-col items-start gap-3 text-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
              <p className="text-lg font-semibold">クリア！全行を打ち切りました。</p>
              <div className="text-sm text-slate-300">ミス {mistakes} / ライン {lines.length}</div>
              <Button onClick={startRun}>もう一度</Button>
            </div>
          )}

          {phase === "dead" && (
            <div className="flex flex-col items-start gap-3 text-amber-100">
              <Skull className="w-8 h-8" />
              <p className="text-lg font-semibold">ライフが尽きました。</p>
              <div className="text-sm text-slate-300">ミス {mistakes} / ライン {solvedCount} / {lines.length}</div>
              <Button onClick={startRun}>再挑戦</Button>
            </div>
          )}

          {phase === "idle" && (
            <div className="text-sm text-slate-300">
              動画IDを入れて「歌詞を取得」を押してください。字幕をローマ字付きで返すバックエンドが必要です。
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">YouTube 動画ID</label>
            <div className="flex flex-col gap-3">
              <input
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="例: dQw4w9WgXcQ"
                className="w-full rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-2 text-slate-100 focus:outline-none focus:border-rose-400"
              />
              <Button onClick={() => void handleFetch()} disabled={!videoId.trim() || phase === "loading"}>
                {phase === "loading" ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> 取得中
                  </span>
                ) : (
                  "歌詞を取得"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-200">動画検索</label>
              <span className="text-[11px] text-slate-400">キーワードで探してIDをセット</span>
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="曲名・アーティスト・番組名など"
                className="w-full rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-2 text-slate-100 focus:outline-none focus:border-rose-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleSearch()
                  }
                }}
              />
              <Button onClick={() => void handleSearch()} disabled={!searchQuery.trim() || isSearching}>
                {isSearching ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> 検索中
                  </span>
                ) : (
                  "動画検索"
                )}
              </Button>
            </div>
            {searchError && (
              <div className="flex items-center gap-2 text-amber-200 text-sm bg-amber-500/10 border border-amber-500/40 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4" /> {searchError}
              </div>
            )}
            {(seedList.length > 0 || searchResults.length > 0) && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {seedList.map((v) => (
                  <button
                    key={`seed-${v.videoId}`}
                    className={`text-left rounded-xl border bg-slate-900/70 hover:bg-slate-800/80 transition flex flex-col h-full ${
                      videoId === v.videoId ? "border-rose-500/60" : "border-slate-800"
                    }`}
                    onClick={() => handlePickVideo(v.videoId)}
                  >
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-slate-100 line-clamp-2">{v.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">歌詞付き (seed)</p>
                      <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-slate-800/80 text-slate-200">これで遊ぶ</span>
                    </div>
                  </button>
                ))}
                {searchResults.map((v) => (
                  <button
                    key={v.videoId}
                    className={`text-left rounded-xl border bg-slate-900/70 hover:bg-slate-800/80 transition flex flex-col h-full ${
                      videoId === v.videoId ? "border-rose-500/60" : "border-slate-800"
                    }`}
                    onClick={() => handlePickVideo(v.videoId)}
                  >
                    {v.thumbnail && (
                      <img src={v.thumbnail} alt={v.title} className="w-full h-28 object-cover rounded-t-xl border-b border-slate-800" />
                    )}
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-slate-100 line-clamp-2">{v.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{v.channelTitle}</p>
                      {v.publishedAt && <p className="text-[11px] text-slate-500">{new Date(v.publishedAt).toLocaleDateString()}</p>}
                      <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-slate-800/80 text-slate-200">これで遊ぶ</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            バックエンドで字幕を取得してローマ字付きで返してください。エンドポイント例: /api/sudden-death/captions?videoId=xxx
          </p>
        </div>
      </div>
    </div>
  )
}
