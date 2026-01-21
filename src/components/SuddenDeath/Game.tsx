import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fetchSuddenLines, searchSuddenVideos, listSuddenVideos } from "../../api/suddenDeath"
import type { SuddenLyricLine, SuddenVideoSearchResult, SuddenVideoListItem } from "../../types"
import { isAcceptedRomaji, prefixOKVariants, splitForHighlight } from "../../lib/typing"
import { Button } from "../ui/Button"
import { AlertTriangle, CheckCircle2, Heart, Loader2, Pause, Play, Skull, Volume2, VolumeX, Zap, Search, Music, Trophy, Sparkles } from "lucide-react"

const MAX_TIMEOUTS = 5

type Phase = "idle" | "loading" | "ready" | "waiting" | "countdown" | "playing" | "cleared" | "dead"

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
  const [playerReadyState, setPlayerReadyState] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [offsetMs, setOffsetMs] = useState(0)
  const [lines, setLines] = useState<SuddenLyricLine[]>([])
  const [videoTitle, setVideoTitle] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [currentIdx, setCurrentIdx] = useState(0)
  const [input, setInput] = useState("")
  const [mistakes, setMistakes] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [solvedCount, setSolvedCount] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [countdownActive, setCountdownActive] = useState(false)
  const [solvedEarly, setSolvedEarly] = useState(false)
  const [progressPhase, setProgressPhase] = useState<"reset" | "animate">("reset")
  const [playerStarted, setPlayerStarted] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const playerRef = useRef<any>(null)
  const lastTimeRef = useRef(0)
  const lastNowRef = useRef<number | null>(null)
  const [shake, setShake] = useState(false)
  const [failGlow, setFailGlow] = useState(false)

  useEffect(() => {
    if (mistakes > 0) {
      setFailGlow(true)
      const t = setTimeout(() => setFailGlow(false), 200)
      return () => clearTimeout(t)
    }
  }, [mistakes])
  const lineSectionRef = useRef<HTMLDivElement | null>(null)
  const manualStartedRef = useRef(false)
  const lineProgressAnchorRef = useRef(0)
  const introSkippedRef = useRef(false)
  const pendingIntroSkipRef = useRef(false)
  const startSecRef = useRef(0)
  const focusAnchorRef = useRef<HTMLDivElement | null>(null)
  const countdownSkippedRef = useRef(false)

  const currentLine = lines[currentIdx] ?? null

  const firstLineStartMs = useMemo(() => {
    if (!lines.length) return 0
    return Math.min(...lines.map((l) => l.startMs))
  }, [lines])

  // Keep typing input focused when it should accept keystrokes
  useEffect(() => {
    if (phase === "playing" || phase === "waiting" || phase === "ready" || phase === "countdown") {
      try { inputRef.current?.focus({ preventScroll: true }) } catch { }
    }
  }, [phase, currentIdx])

  useEffect(() => {
    if ((window as any).YT?.Player) {
      setYtReady(true)
      return
    }
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    const onReady = () => setYtReady(true)
      ; (window as any).onYouTubeIframeAPIReady = onReady
    document.body.appendChild(tag)
    return () => {
      if ((window as any).onYouTubeIframeAPIReady === onReady) {
        ; (window as any).onYouTubeIframeAPIReady = undefined
      }
    }
  }, [])

  useEffect(() => {
    if (!ytReady || !videoId) return
    if (!isValidVideoId(videoId)) {
      setError("動画IDが不正です")
      return
    }
    setPlayerReady(false)
    setPlayerReadyState(false)
    const YT = (window as any).YT
    if (!playerRef.current) {
      playerRef.current = new YT.Player("sudden-player", {
        videoId,
        playerVars: { modestbranding: 1, rel: 0, disablekb: 1 },
        events: {
          onReady: (e: any) => {
            setPlayerReady(true)
            setPlayerReadyState(true)
            if (pendingIntroSkipRef.current) {
              pendingIntroSkipRef.current = false
              startCountdownToFirstLine()
            }
            try {
              e.target.setVolume(volume * 100)
              setDuration(e.target.getDuration?.() || 0)
            } catch { }
          },
          onStateChange: (e: any) => {
            const state = e.data
            if (!playerReadyState) setPlayerReadyState(true)
            if (state === 1) setPlayerStarted(true)
            if (state === 1 && pendingIntroSkipRef.current && !introSkippedRef.current) {
              pendingIntroSkipRef.current = false
              startCountdownToFirstLine()
              setIsPlaying(false)
              return
            }
            if (state === 1) {
              setIsPlaying(true)
              const introSkipInFlight = pendingIntroSkipRef.current || introSkippedRef.current
              if (!manualStartedRef.current && lines.length > 0 && phase !== "playing" && !introSkipInFlight) {
                manualStartedRef.current = true
                resetState()
                setPhase("waiting")
              } else {
                manualStartedRef.current = true
              }
              // keep focus on typing input so Space goes to our handler instead of iframe
              setTimeout(() => { try { inputRef.current?.focus({ preventScroll: true }) } catch { } }, 0)
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
        setPlayerReadyState(true)
        setIsPlaying(false)
        setCurrentTime(0)
        lastTimeRef.current = 0
        lastNowRef.current = null
      } catch { }
    }
    return () => {
      try { playerRef.current?.destroy() } catch { }
      playerRef.current = null
    }
  }, [ytReady, videoId, volume])

  useEffect(() => {
    if (!playerRef.current) return
    let raf: number | null = null
    let intervalId: number | null = null

    const update = () => {
      try {
        const now = performance.now()
        let t = playerRef.current.getCurrentTime?.()
        if (Number.isFinite(t)) {
          lastTimeRef.current = t as number
          lastNowRef.current = now
        } else if (isPlaying && lastNowRef.current != null) {
          const delta = (now - lastNowRef.current) / 1000
          lastTimeRef.current = Math.max(0, lastTimeRef.current + delta)
          lastNowRef.current = now
          t = lastTimeRef.current
        } else {
          t = lastTimeRef.current
        }
        const d = playerRef.current.getDuration?.() || 0
        setCurrentTime(t)
        setDuration(d)
        const adjusted = t * 1000 + offsetMs

        // Countdown trigger: start showing 3s before first line (only if first line has a positive timestamp)
        if (phase === "waiting" && lines.length > 0 && !countdownActive && !introSkippedRef.current && firstLineStartMs > 0 && adjusted < firstLineStartMs) {
          const remainingToFirst = firstLineStartMs - adjusted
          if (!countdownSkippedRef.current && remainingToFirst <= 3000) {
            const nextCountdown = Math.max(0, Math.ceil(remainingToFirst / 1000))
            setCountdown(nextCountdown)
            setCountdownActive(true)
            setPhase("countdown")
            introSkippedRef.current = true
            pendingIntroSkipRef.current = false
            // stay in waiting; countdown effect handles transition to playing
          }
        }

        if (phase === "countdown" && lines.length > 0) {
          // while counting down, keep currentIdx at 0 and keep playing
          setCurrentIdx(0)
          try {
            playerRef.current?.unMute?.()
            playerRef.current?.playVideo?.()
            setIsPlaying(true)
          } catch { /* ignore */ }
        }

        if (phase === "waiting" && lines.length > 0 && adjusted >= firstLineStartMs && !countdownActive) {
          setPhase("playing")
          setCurrentIdx(0)
          setInput("")
          // wait: when first line is reached, switch to playing
        }
        if ((phase === "playing" || phase === "waiting" || phase === "countdown") && lines.length > 0) {
          // 過ぎた行をスキップし、まだ終わっていない最初の行をカレントにする
          const nextIdx = lines.findIndex((l) => adjusted < l.endMs)
          if (nextIdx === -1) {
            setPhase("cleared")
          } else if (nextIdx !== currentIdx) {
            setSolvedEarly(false)
            setCurrentIdx(nextIdx)
            setInput("")
          }
        }
      } catch { }
    }

    const tick = () => {
      update()
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    // 背景タブやウィンドウ非アクティブで rAF が絞られた場合のフォールバック
    intervalId = window.setInterval(update, 400)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [phase, lines, currentIdx, offsetMs, firstLineStartMs, isPlaying, countdownActive])

  // Countdown before first line (start showing ~3s before first line)
  useEffect(() => {
    if (!countdownActive) return
    if (countdown == null) return
    if (countdown <= 0) {
      setIsPlaying(true)
      manualStartedRef.current = true
      setPhase("playing")
      setCurrentIdx(0)
      setInput("")
      setCountdown(null)
      setCountdownActive(false)
      setSolvedEarly(false)
      return
    }
    const id = window.setTimeout(() => {
      setCountdown((c) => (c == null ? null : c - 1))
    }, 1000)
    return () => window.clearTimeout(id)
  }, [countdownActive, countdown, firstLineStartMs])

  const highlight = useMemo(() => {
    if (!currentLine) return null
    return splitForHighlight(input, currentLine.romaji)
  }, [currentLine, input])

  const renderRomaji = useCallback((s: string) => s.replace(/-/g, "\u2011"), [])

  const handleSkipLine = useCallback((opts?: { seekToNextStart?: boolean }) => {
    if (phase !== "playing" && phase !== "waiting") return
    if (!lines.length) return
    const nextIdx = currentIdx + 1
    setInput("")
    setSolvedEarly(false)
    if (nextIdx >= lines.length) {
      setPhase("cleared")
    } else {
      setCurrentIdx(nextIdx)
      if (opts?.seekToNextStart && playerRef.current) {
        const targetStartMs = lines[nextIdx]?.startMs
        const targetSec = typeof targetStartMs === "number" ? targetStartMs / 1000 : null
        if (targetSec != null && Number.isFinite(targetSec)) {
          try { playerRef.current.seekTo(targetSec, true) } catch { /* ignore */ }
          setCurrentTime(targetSec)
          lastTimeRef.current = targetSec
          lastNowRef.current = typeof performance !== "undefined" ? performance.now() : null
        }
      }
    }
  }, [phase, lines, currentIdx, offsetMs])

  const lineProgress = useMemo(() => {
    if (phase !== "playing") return 0
    if (!currentLine) return 0
    const span = currentLine.endMs - currentLine.startMs
    if (span <= 0) return 1
    const adjusted = currentTime * 1000 + offsetMs
    const anchor = lineProgressAnchorRef.current || currentLine.startMs
    if (adjusted < anchor) return 0
    const t = (adjusted - anchor) / span
    return Math.min(1, Math.max(0, t))
  }, [phase, currentLine, currentTime, offsetMs])

  const lineStartSec = currentLine ? currentLine.startMs / 1000 : 0
  const lineEndSec = currentLine ? currentLine.endMs / 1000 : 0

  useEffect(() => {
    if (!currentLine) return
    // reset anchor to the current line's start so gauge always starts at 0
    lineProgressAnchorRef.current = currentLine.startMs
    setProgressPhase("reset")
    // 2フレーム後にアニメーションを有効化
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setProgressPhase("animate"))
    })
    return () => cancelAnimationFrame(id)
  }, [currentIdx, currentLine])

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
    resetState({ resetManualStart: true })
    setPhase("ready")
    setCurrentIdx(0)
    setInput("")
    setMistakes(0)
    setSolvedCount(0)
    setError(null)
    setCountdown(null)
    setCountdownActive(false)
    setSolvedEarly(false)
    try {
      playerRef.current?.pauseVideo()
      playerRef.current?.seekTo(0, true)
      setIsPlaying(false)
      setCurrentTime(0)
      lastTimeRef.current = 0
      lastNowRef.current = null
    } catch { }
  }, [lines])

  const resetState = (opts?: { clearLines?: boolean; resetManualStart?: boolean }) => {
    if (opts?.clearLines) setLines([])
    if (opts?.resetManualStart) manualStartedRef.current = false
    introSkippedRef.current = false
    pendingIntroSkipRef.current = false
    countdownSkippedRef.current = false
    setPlayerStarted(false)
    if (opts?.resetManualStart || opts?.clearLines) {
      lastTimeRef.current = 0
      lastNowRef.current = null
    }
    setCountdown(null)
    setCountdownActive(false)
    setSolvedEarly(false)
    setCurrentIdx(0)
    setInput("")
    setMistakes(0)
    setSolvedCount(0)
    setError(null)
    startSecRef.current = 0
  }

  const handleFetch = async (idOverride?: string) => {
    const targetId = (idOverride ?? videoId).trim()
    if (!isValidVideoId(targetId)) {
      setError("動画IDが不正です")
      return
    }
    if (targetId !== videoId) setVideoId(targetId)
    resetState({ clearLines: true, resetManualStart: true })
    setPhase("loading")
    setPlayerStarted(false)
    try {
      const data = await fetchSuddenLines(targetId)
      if (!data?.lines || data.lines.length === 0) throw new Error("歌詞（字幕）が空です")
      setError(null)
      setLines(data.lines)
      setVideoTitle(data.title || "")
      setPhase("ready")
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
    const matchedTitle =
      seedList.find((s) => s.videoId === id)?.title || searchResults.find((s) => s.videoId === id)?.title || ""
    setVideoId(id)
    setVideoTitle(matchedTitle)
    setError(null)
    setPhase("idle")
    setPlayerStarted(false)
    setPlayerReady(false)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    manualStartedRef.current = false
    lastTimeRef.current = 0
    lastNowRef.current = null
    setCountdown(null)
    setCountdownActive(false)
    setSolvedEarly(false)
    startSecRef.current = 0
    void handleFetch(id)
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
    // クリア/失敗後のリセット用: READY に戻すだけで自動再生しない
    if (!lines.length) {
      setPhase("idle")
      return
    }
    resetState({ resetManualStart: true })
    setPhase("ready")
    try {
      playerRef.current?.pauseVideo()
      playerRef.current?.seekTo(0, true)
      setIsPlaying(false)
      setPlayerStarted(false)
      setCurrentTime(0)
      lastTimeRef.current = 0
      lastNowRef.current = null
    } catch { /* ignore */ }
  }, [lines])

  const startFromBeginning = useCallback(() => {
    if (!lines.length) return
    introSkippedRef.current = false
    pendingIntroSkipRef.current = false
    countdownSkippedRef.current = false
    manualStartedRef.current = false
    startSecRef.current = 0
    setCountdown(null)
    setCountdownActive(false)
    setSolvedEarly(false)
    setCurrentIdx(0)
    setInput("")
    setPhase("waiting")
    try {
      playerRef.current?.seekTo(0, true)
      playerRef.current?.unMute?.()
      playerRef.current?.playVideo()
      setIsPlaying(true)
      setCurrentTime(0)
      lastTimeRef.current = 0
      lastNowRef.current = typeof performance !== "undefined" ? performance.now() : null
    } catch { /* ignore */ }
  }, [lines.length])

  const handleSolved = () => {
    const nextIdx = currentIdx + 1
    setSolvedCount((c) => c + 1)
    // Lock input until the line's time window ends
    setSolvedEarly(true)
    setInput("")
    if (nextIdx >= lines.length) {
      // stay on last line visually; when time passes endMs it will clear
    }
  }

  const handleInput = (val: string) => {
    if (!currentLine) return
    if (phase !== "playing") return
    if (!currentLine) return
    if (solvedEarly) return
    // 伸ばし棒（ハイフン）も許容する
    const sanitized = val.replace(/[^a-zA-Z'\s-]/g, "")
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

  const startCountdownToFirstLine = useCallback(() => {
    if (!lines.length) return
    if (countdownActive || phase === "countdown") return
    if (!(Number.isFinite(firstLineStartMs) && firstLineStartMs > 0)) return
    const startSec = Number.isFinite(firstLineStartMs) ? Math.max(0, firstLineStartMs / 1000 - 3) : 0
    introSkippedRef.current = false
    pendingIntroSkipRef.current = false
    countdownSkippedRef.current = false
    manualStartedRef.current = true
    startSecRef.current = startSec
    setPhase("countdown")
    setCountdown(3)
    setCountdownActive(true)
    setSolvedEarly(false)
    setCurrentIdx(0)
    setInput("")
    try {
      playerRef.current?.seekTo(startSec, true)
      playerRef.current?.unMute?.()
      playerRef.current?.playVideo()
      setIsPlaying(true)
      setCurrentTime(startSec)
      lastTimeRef.current = startSec
      lastNowRef.current = typeof performance !== "undefined" ? performance.now() : null
    } catch { /* ignore */ }
  }, [lines.length, firstLineStartMs, countdownActive, phase])

  const statusTag = (() => {
    switch (phase) {
      case "waiting": return { text: "READY", color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" }
      case "countdown": return { text: "COUNTDOWN", color: "bg-blue-500/20 text-blue-100 border-blue-500/40" }
      case "playing": return { text: "BEAT TYPE RUSH", color: "bg-rose-500/20 text-rose-200 border-rose-500/40" }
      case "ready": return { text: "READY", color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" }
      case "cleared": return { text: "CLEARED", color: "bg-sky-500/20 text-sky-200 border-sky-500/40" }
      case "dead": return { text: "FAILED", color: "bg-amber-500/20 text-amber-100 border-amber-500/40" }
      default: return { text: "IDLE", color: "bg-slate-700/30 text-slate-200 border-slate-600/50" }
    }
  })()

  const requestIntroSkip = useCallback(() => {
    if (!lines.length) return
    const adjusted = currentTime * 1000 + offsetMs
    // イントロ区間を過ぎている場合はスキップさせない
    if (lines.length > 0 && Number.isFinite(firstLineStartMs) && adjusted >= firstLineStartMs - 200) {
      return
    }
    pendingIntroSkipRef.current = true
    try { playerRef.current?.unMute?.() } catch { /* ignore */ }
    try { playerRef.current?.playVideo?.() } catch { /* ignore */ }
    setTimeout(() => { try { playerRef.current?.playVideo?.() } catch { /* ignore */ } }, 120)
    if (playerReadyState) {
      startCountdownToFirstLine()
    }
  }, [lines.length, playerReadyState, startCountdownToFirstLine, currentTime, offsetMs, firstLineStartMs])

  useEffect(() => {
    const iframe = playerRef.current?.getIframe?.()
    if (iframe) {
      iframe.setAttribute("tabindex", "-1")
      const handleFocus = () => {
        try { focusAnchorRef.current?.focus({ preventScroll: true }) } catch { }
      }
      iframe.addEventListener("focus", handleFocus)
      return () => iframe.removeEventListener("focus", handleFocus)
    }
  }, [playerReadyState, videoId])

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === "IFRAME") {
        try { (target as HTMLIFrameElement).blur() } catch { }
        try { focusAnchorRef.current?.focus({ preventScroll: true }) } catch { }
      }
    }
    document.addEventListener("focusin", handleFocusIn, true)
    const intervalId = window.setInterval(() => {
      const active = document.activeElement
      if (active && active.tagName === "IFRAME") {
        try { (active as HTMLIFrameElement).blur() } catch { }
        try { focusAnchorRef.current?.focus({ preventScroll: true }) } catch { }
      }
    }, 200)
    return () => {
      document.removeEventListener("focusin", handleFocusIn, true)
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    // iframe がフォーカスを奪っている場合も含めて、状態遷移時に親へフォーカスを戻す
    const iframe = playerRef.current?.getIframe?.()
    if (iframe) {
      try { iframe.blur() } catch { }
    }
    try { focusAnchorRef.current?.focus({ preventScroll: true }) } catch { }
    if (phase === "playing") {
      try { inputRef.current?.focus({ preventScroll: true }) } catch { }
    }
  }, [phase, playerReadyState, videoId])

  useEffect(() => {
    // 親ドキュメントにフォーカスを戻し、スペースキーを確実に拾う
    const focusApp = () => {
      try { focusAnchorRef.current?.focus({ preventScroll: true }) } catch { }
      if (phase === "playing") {
        try { inputRef.current?.focus({ preventScroll: true }) } catch { }
      }
    }
    if (phase === "ready" || phase === "waiting" || phase === "countdown") {
      focusApp()
    }
    const onKey = (e: KeyboardEvent) => {
      const getAdjustedNow = () => {
        const live = playerRef.current?.getCurrentTime?.()
        const t = Number.isFinite(live) ? (live as number) : currentTime
        return t * 1000 + offsetMs
      }
      const adjustedNow = getAdjustedNow()
      const firstLineMs = Number.isFinite(firstLineStartMs) ? firstLineStartMs : null
      const beforeFirstLine = firstLineMs == null ? false : adjustedNow < firstLineMs - 100

      // シークでイントロ前に戻した場合はフラグを下げる
      if (beforeFirstLine && introSkippedRef.current) {
        introSkippedRef.current = false
        pendingIntroSkipRef.current = false
        countdownSkippedRef.current = false
      }

      if (e.code === "F4") {
        e.preventDefault()
        handleReset()
        return
      }
      if (e.code === "Space") {
        e.preventDefault()
        e.stopPropagation()
        if (phase === "countdown") {
          // カウントダウンを即スキップして開始する
          const primed = Number.isFinite(startSecRef.current) && startSecRef.current > 0
          const startSec = primed ? startSecRef.current : 0
          startSecRef.current = startSec
          setCountdown(0)
          setCountdownActive(false)
          introSkippedRef.current = false
          pendingIntroSkipRef.current = false
          countdownSkippedRef.current = true
          manualStartedRef.current = true
          setPhase("playing")
          setCurrentIdx(0)
          setInput("")
          setSolvedEarly(false)
          setCountdown(null)
          try {
            if (Number.isFinite(startSec)) {
              playerRef.current?.seekTo(startSec, true)
              setCurrentTime(startSec)
              lastTimeRef.current = startSec
              lastNowRef.current = typeof performance !== "undefined" ? performance.now() : null
            }
            playerRef.current?.playVideo()
            setIsPlaying(true)
          } catch { /* ignore */ }
          return
        }
        if (phase === "playing" && beforeFirstLine) {
          startCountdownToFirstLine()
          return
        }
        if (phase === "ready") {
          startFromBeginning()
          return
        }
        if (phase === "waiting") {
          if (!beforeFirstLine && !isPlaying) {
            startFromBeginning()
            return
          }
          if (beforeFirstLine) {
            startCountdownToFirstLine()
            return
          }
        }
        const introDone = introSkippedRef.current || !beforeFirstLine
        if ((phase === "playing" || phase === "waiting") && introDone) {
          handleSkipLine({ seekToNextStart: true })
          return
        }
        if (phase === "playing") {
          handleReset()
          return
        }
      }
      if (phase === "playing" && e.code === "Escape") {
        e.preventDefault()
        handleSkipLine()
      }
    }
    document.addEventListener("keydown", onKey, { capture: true })
    return () => document.removeEventListener("keydown", onKey, { capture: true } as any)
  }, [phase, handleSkipLine, requestIntroSkip, firstLineStartMs, startCountdownToFirstLine, startFromBeginning, handleReset, currentTime, offsetMs, isPlaying])

  const formatTime = (t: number) => {
    if (!Number.isFinite(t)) return "0:00"
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const currentRatio = duration ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const displayTitle = videoTitle || (videoId ? `ID: ${videoId}` : "曲タイトル未取得")

  useEffect(() => {
    if (playerReadyState && pendingIntroSkipRef.current) {
      startCountdownToFirstLine()
    }
  }, [playerReadyState, startCountdownToFirstLine])

  // イントロ以降（最初の行開始後）は Space がリセットにならないよう introSkipped を自動で立てる
  useEffect(() => {
    const adjusted = currentTime * 1000 + offsetMs
    if (!introSkippedRef.current && lines.length && Number.isFinite(firstLineStartMs) && adjusted >= firstLineStartMs) {
      introSkippedRef.current = true
      pendingIntroSkipRef.current = false
    }
  }, [currentTime, offsetMs, firstLineStartMs, lines.length])

  // --- Premium Theater UI Render ---
  return (
    <div className="relative w-full min-h-[90vh] md:h-screen max-h-[1080px] bg-black text-slate-100 overflow-hidden rounded-[2rem] shadow-2xl border border-slate-800 font-sans selection:bg-rose-500/30 group/app">

      {/* 0. Logic Helpers (Invisible) */}
      <div ref={focusAnchorRef} tabIndex={-1} aria-hidden="true" className="sr-only" />

      {/* 1. Background / Video Layer (Always present but styled differently per phase) */}
      <div className={`absolute inset-0 transition-all duration-1000 ${phase === 'idle' || phase === 'loading' ? 'opacity-40 blur-sm scale-110' : 'opacity-100 scale-100'}`}>
        {/* The Player Div - MUST be preserved for YT API */}
        <div className="absolute inset-0 w-full h-full bg-slate-950">
          <div
            id="sudden-player"
            className="w-full h-full pointer-events-none"
            tabIndex={-1}
          />
        </div>

        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_120%)] pointer-events-none mix-blend-multiply" />
        {(phase === 'ready' || phase === 'waiting') && (
          <div className="absolute bottom-0 right-0 w-56 h-40 bg-gradient-to-tl from-black via-black/90 to-transparent pointer-events-none" />
        )}
      </div>

      {/* 2. Main UI Layer */}
      <div className="relative z-10 w-full h-full flex flex-col">

        {/* --- Phase A: Search & Lobby --- */}
        {(phase === 'idle' || phase === 'loading') && (
          <div className="flex-1 flex flex-col p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8 z-20">
              {/* Logo */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-rose-500/40 blur-xl rounded-full animate-pulse" />
                  <div className="relative p-4 bg-slate-900/80 rounded-2xl border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                    <Zap className="w-8 h-8 text-rose-400 fill-rose-400/20" />
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-200 to-rose-500 drop-shadow-sm">
                    BEAT TYPE <span className="text-rose-500">RUSH</span>
                  </h1>
                  <p className="text-sm font-bold text-rose-300/60 tracking-[0.3em] uppercase mt-1">
                    Sync x Rhythm x Typing
                  </p>
                </div>
              </div>

              {/* Search Box */}
              <div className="w-full max-w-xl relative group">
                <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-lg group-hover:bg-rose-500/30 transition-all opacity-0 group-focus-within:opacity-100" />
                <div className="relative flex items-center bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl transition-all group-focus-within:border-rose-500/50 group-focus-within:ring-2 group-focus-within:ring-rose-500/20">
                  <Search className="w-5 h-5 text-slate-400 ml-4" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search YouTube or Enter URL..."
                    className="w-full bg-transparent border-none text-white px-4 py-4 focus:ring-0 placeholder:text-slate-600"
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSearch() }}
                  />
                  <Button
                    onClick={() => void handleSearch()}
                    disabled={isSearching}
                    className="mr-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-6 py-2 font-bold shadow-lg shadow-rose-900/30 transition-all active:scale-95"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "SEARCH"}
                  </Button>
                </div>
                {searchError && (
                  <div className="absolute top-full left-0 mt-3 flex items-center gap-2 text-rose-300 text-sm bg-rose-950/80 border border-rose-500/30 px-4 py-2 rounded-xl animate-shake">
                    <AlertTriangle className="w-4 h-4" /> {searchError}
                  </div>
                )}
              </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 -mx-2">
              {(seedList.length === 0 && searchResults.length === 0 && !searchQuery) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500/50 space-y-4">
                  <Music className="w-24 h-24 stroke-[1]" />
                  <p className="text-xl font-light">Find your beat via search to start</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-20">
                  {[...seedList, ...searchResults].map((v: any) => {
                    const isActive = videoId === v.videoId;
                    return (
                      <button
                        key={v.videoId}
                        onClick={() => handlePickVideo(v.videoId)}
                        className={`
                            group relative text-left rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]
                            ${isActive ? 'ring-2 ring-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)] z-10' : 'hover:shadow-2xl hover:shadow-black/50 opacity-80 hover:opacity-100'}
                          `}
                      >
                        {/* Card Bg */}
                        <div className="absolute inset-0 bg-slate-900 border border-slate-800 group-hover:border-rose-500/30 transition-colors" />

                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-black overflow-hidden">
                          {v.thumbnail ? (
                            <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800"><Music className="w-8 h-8 text-slate-600" /></div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px]">
                            <Play className="w-12 h-12 fill-white text-white drop-shadow-lg" />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="relative p-4">
                          <h3 className="text-sm font-bold text-slate-100 line-clamp-2 mb-1 group-hover:text-rose-300 transition-colors">{v.title}</h3>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-500 line-clamp-1">{v.channelTitle || 'Unknown'}</p>
                            {v.hasLyrics && <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">LYRICS</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer Tip */}
            <div className="pb-2 text-center text-xs text-slate-500 font-mono">
              Engine Ready • Powered by YouTube API • v2.0 Rose
            </div>
          </div>
        )}


        {/* --- Phase B: Theater / Play --- */}
        {!(phase === 'idle' || phase === 'loading') && (
          <div className="flex-1 relative flex flex-col">

            {/* Top HUD */}
            <div className="absolute top-0 inset-x-0 z-50 p-6 flex items-start justify-between bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
              <div className="pointer-events-auto">
                <Button variant="ghost" onClick={() => setPhase('idle')} className="group text-slate-400 hover:text-white gap-2">
                  <div className="bg-slate-800/80 p-1.5 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors border border-slate-700">
                    <Search className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">Back to Search</span>
                </Button>
              </div>

              {/* Game Stats */}
              <div className="flex gap-8">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-rose-500 tracking-widest mb-1">Score</div>
                  <div className="text-4xl font-black font-mono text-white text-shadow-neon">
                    {(solvedCount * 100).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest mb-1">Lives</div>
                  <div className="flex gap-1 bg-black/40 backdrop-blur rounded-lg p-2 border border-white/5">
                    {Array.from({ length: MAX_TIMEOUTS }).map((_, i) => (
                      <Heart key={i} className={`w-5 h-5 transition-all ${i < (MAX_TIMEOUTS - mistakes) ? 'fill-rose-500 text-rose-500 drop-shadow-glow' : 'fill-slate-800 text-slate-800'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Stage: Interaction Area */}
            <div className="flex-1 flex flex-col items-center justify-end pb-24 px-4 sm:px-12 relative z-40">

              {/* Countdown */}
              {phase === 'countdown' && countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                  <div key={countdown} className="text-[15rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] animate-in zoom-in-50 fade-out duration-700">
                    {countdown}
                  </div>
                </div>
              )}

              {/* Game Over / Cleared */}
              {(phase === 'cleared' || phase === 'dead') && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-500">
                  <div className="bg-slate-950 border border-slate-800 p-10 rounded-[3rem] text-center max-w-lg w-full shadow-2xl relative overflow-hidden">
                    <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${phase === 'cleared' ? 'from-emerald-500 to-teal-900' : 'from-rose-500 to-red-900'}`} />

                    <div className="relative z-10 space-y-6">
                      <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${phase === 'cleared' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-500'}`}>
                        {phase === 'cleared' ? <Trophy className="w-12 h-12" /> : <Skull className="w-12 h-12" />}
                      </div>
                      <h2 className="text-4xl font-black text-white">{phase === 'cleared' ? 'STAGE CLEARED!' : 'GAME OVER'}</h2>

                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="bg-white/5 p-4 rounded-2xl">
                          <div className="text-[10px] text-slate-400 uppercase">Score</div>
                          <div className="text-2xl font-mono font-bold">{(solvedCount * 100).toLocaleString()}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl">
                          <div className="text-[10px] text-slate-400 uppercase">Miss</div>
                          <div className="text-2xl font-mono font-bold text-rose-400">{mistakes}</div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button onClick={() => setPhase('idle')} variant="secondary" className="flex-1 h-12">Search</Button>
                        <Button onClick={startRun} className="flex-1 h-12 bg-rose-600 hover:bg-rose-500 text-white font-bold">Replay</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ACTIVE GAMEPLAY AREA */}
              {(phase === 'playing' || phase === 'countdown' || phase === 'waiting' || phase === 'ready') && (
                <div className="w-full max-w-5xl space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-500">

                  {phase === 'ready' && (
                    <div className="rounded-2xl border border-slate-800 bg-black/50 px-6 py-5 flex items-center justify-between gap-4 shadow-lg">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-rose-300/80 font-bold">BEAT TYPE RUSH</div>
                        <div className="text-lg font-semibold text-white">{displayTitle}</div>
                        <div className="text-xs text-slate-400">スペース / START で曲冒頭から再生します</div>
                      </div>
                      <Button onClick={startFromBeginning} className="px-5 py-3 text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-900/30">
                        START GAME
                      </Button>
                    </div>
                  )}

                  {/* Main Lyrics Display */}
                  <div ref={lineSectionRef} onClick={() => inputRef.current?.focus()} className="relative text-center group cursor-text">

                    {/* Next Line Preview */}
                    {lines[currentIdx + 1] && (
                      <div className="mb-4 opacity-50 transition-opacity group-hover:opacity-70">
                        <p className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-1">Next</p>
                        <p className="text-xl text-slate-300 blur-[1px] group-hover:blur-0 transition-all">{lines[currentIdx + 1].text}</p>
                      </div>
                    )}

                    {/* Current Line */}
                    {currentLine && (
                      <div className="bg-black/60 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-2xl transition-all duration-200 hover:border-white/20 hover:bg-black/70">
                        <div className="flex justify-center">
                          <h3 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-md text-left max-w-4xl w-fit">
                            {currentLine.text}
                          </h3>
                        </div>

                        {/* Romaji Input Area */}
                        <div className={`
                               relative block w-fit max-w-[90vw] md:max-w-4xl mx-auto px-6 py-6 rounded-2xl bg-slate-900/80 border-2 text-2xl md:text-3xl font-mono font-bold tracking-wider transition-transform break-all whitespace-pre-wrap leading-relaxed text-left
                               ${shake ? 'border-rose-500 animate-shake' : 'border-slate-700 focus-within:border-emerald-500'}
                               ${failGlow ? 'shadow-[0_0_30px_rgba(244,63,94,0.5)]' : 'shadow-xl'}
                             `}>
                          {highlight ? (
                            <span className="inline">
                              <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)] border-b-2 border-emerald-500/30">
                                {renderRomaji(highlight.correct)}
                              </span>
                              <span className={`rounded px-0.5 ${highlight.isMistake ? "bg-rose-600 text-white" : "text-white bg-white/10"}`}>
                                {renderRomaji(highlight.next)}
                              </span>
                              <span className="text-slate-600">{renderRomaji(highlight.rest)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">{renderRomaji(currentLine.romaji)}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress Bar (Line specific) */}
                    {currentLine && (
                      <div className="mt-6 flex items-center gap-4 text-xs font-mono text-slate-400 max-w-2xl mx-auto">
                        <span>{formatTime(lineStartSec)}</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-transform duration-100 ease-linear origin-left"
                            style={{ transform: `scaleX(${lineProgress})`, width: '100%' }}
                          />
                        </div>
                        <span>{formatTime(lineEndSec)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hidden Input Layer */}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                className="absolute opacity-0 pointer-events-none"
                autoFocus
                disabled={phase !== "playing"}
              />

            </div>

            {/* Bottom Progress (Song) */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-900/50">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-pink-500 to-purple-600 shadow-[0_0_15px_rgba(244,63,94,0.6)] transition-all duration-500 ease-out"
                style={{ width: `${currentRatio * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
