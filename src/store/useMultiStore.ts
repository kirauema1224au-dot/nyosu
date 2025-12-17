import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

export type MultiMode = 'practice' | 'flash'

type Player = {
  id: string
  name: string
  score: number
  correctCount: number
  mistakeCount: number
  timeouts?: number
}

type RoomState = {
  roomId: string
  isStarted: boolean
  players: Record<string, Player>
  difficulty?: string
}

type MultiState = {
  connected: boolean
  socket: Socket | null
  isInRoom: boolean
  name: string
  room: RoomState | null
  mode: MultiMode | null
  difficulty: string | null
  started: boolean
  startAt: number | null
  durationSec: number
  collapsed: boolean
}

type MultiActions = {
  connect: () => void
  disconnect: () => void
  createRoom: (name: string, mode: MultiMode, difficulty: string) => void
  joinRoom: (roomId: string, name: string) => void
  leaveRoom: () => void
  setMode: (m: MultiMode) => void
  startGame: (mode: MultiMode) => void
  sendProgress: (p: { score: number; correctCount: number; mistakeCount: number; timeouts?: number }) => void
  setCollapsed: (v: boolean) => void
  setName: (name: string) => void
}

const SOCKET_URL = 'http://localhost:3001'

export const useMultiStore = create<MultiState & MultiActions>()((set, get) => ({
  connected: false,
  socket: null,
  isInRoom: false,
  name: '',
  room: null,
  mode: null,
  difficulty: null,
  started: false,
  startAt: null,
  durationSec: 120,
  collapsed: false,

  connect: () => {
    const prev = get().socket
    if (prev) return
    const socket = io(SOCKET_URL)
    set({ socket })
    socket.on('connect', () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))
    socket.on('room_update', (room: RoomState) => {
      set({ room, isInRoom: true, difficulty: room.difficulty ?? null })
    })
    socket.on('game_started', () => {
      // Fallback: align local clocks with 3s countdown
      const startAt = Date.now() + 3000
      const mode = get().mode ?? 'practice'
      set({ started: true, startAt, mode })
      // Route navigation hint
      try {
        if (mode === 'flash') {
          if (location.hash !== '#flash') location.hash = '#flash'
        } else {
          // All practice modes map to #practice
          if (location.hash !== '#practice') location.hash = '#practice'
        }
      } catch { }
    })
  },

  disconnect: () => {
    const s = get().socket
    if (s) {
      try { s.disconnect() } catch { }
    }
    set({ socket: null, connected: false, isInRoom: false, room: null, started: false, startAt: null })
  },

  createRoom: (name: string, mode: MultiMode, difficulty: string) => {
    const s = get().socket ?? (get().connect(), get().socket)
    if (!s) return
    set({ name, mode, difficulty }) // Set local mode immediately
    s.emit('create_room', { name, mode, difficulty }, (res: any) => {
      if (res?.error) {
        console.warn(res.error)
        return
      }
      const room = res.room as RoomState
      set({ room, isInRoom: true, difficulty: room.difficulty ?? difficulty })
      const n = get().name?.trim()
      // Auto-join as host if name is present (server may already include)
      if (n) {
        try { s.emit('join_room', { roomId: room.roomId, name: n }) } catch { }
      }
    })
  },

  joinRoom: (roomId: string, name: string) => {
    const s = get().socket ?? (get().connect(), get().socket)
    if (!s) return
    set({ name })
    s.emit('join_room', { roomId, name }, (res: any) => {
      if (res?.error) {
        console.warn(res.error)
        return
      }
      set({ room: res.room as RoomState, isInRoom: true, started: !!res.room?.isStarted, difficulty: res.room?.difficulty ?? null })
    })
  },

  leaveRoom: () => {
    const s = get().socket
    const roomId = get().room?.roomId
    if (s && roomId) {
      try { s.emit('leave_room', { roomId }) } catch { }
    }
    set({ isInRoom: false, room: null, started: false, startAt: null })
    try { if (location.hash === '#flash') location.hash = '' } catch { }
  },

  setMode: (m: MultiMode) => set({ mode: m }),

  startGame: (mode: MultiMode) => {
    const s = get().socket
    const roomId = get().room?.roomId
    if (!s || !roomId) return
    set({ mode })
    s.emit('start_game', { roomId })
  },

  sendProgress: ({ score, correctCount, mistakeCount, timeouts }) => {
    const s = get().socket
    const roomId = get().room?.roomId
    if (!s || !roomId) return
    s.emit('progress_update', { roomId, score, correctCount, mistakeCount, timeouts })
  },

  setCollapsed: (v: boolean) => set({ collapsed: v }),

  setName: (name: string) => {
    set({ name })
    // If already have a room but not sure about membership, try joining
    const roomId = get().room?.roomId
    const s = get().socket
    const n = name.trim()
    if (s && roomId && n) {
      try { s.emit('join_room', { roomId, name: n }) } catch { }
    }
  },
}))
