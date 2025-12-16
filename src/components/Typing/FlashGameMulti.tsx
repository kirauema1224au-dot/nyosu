import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Shield, Zap, Users, Trophy, Hash, CheckCircle2, AlertCircle } from "lucide-react";
import { useMultiStore, MultiMode } from "../../store/useMultiStore";

type Player = {
  id: string;
  name: string;
  score: number;
  correctCount: number;
  mistakeCount: number;
};

export function FlashGameMulti({ defaultMode }: { defaultMode?: 'practice' | 'flash' } = {}) {
  const multi = useMultiStore()
  const connected = useMultiStore((s) => s.connected)
  const room = useMultiStore((s) => s.room)
  const gameStarted = useMultiStore((s) => s.started)
  const isInRoom = useMultiStore((s) => s.isInRoom)

  // Default to practice-normal if generic practice is requested, though local state handles specific string
  const [mode, setMode] = useState<MultiMode>(defaultMode === 'practice' ? 'practice-normal' : (defaultMode ?? 'practice-normal'));
  const [name, setName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);

  useEffect(() => { multi.connect() }, [])

  const handleCreateRoom = () => {
    multi.createRoom(name.trim(), mode)
  };

  const handleJoinRoom = () => {
    if (!name.trim() || !roomIdInput.trim()) {
      alert("名前とルームIDを入力してください");
      return;
    }
    multi.joinRoom(roomIdInput.trim(), name.trim())
  };

  const handleStartGame = () => {
    if (!room) return;
    multi.setMode(mode)
    multi.startGame(mode)
  };

  const sortedPlayers: Player[] = room
    ? Object.values(room.players).sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 tracking-wider filter drop-shadow-sm flex items-center gap-3">
            <Users className="w-8 h-8 text-sky-400" />
            MULTIPLAYER LOBBY
          </h1>
          <p className="text-slate-400 mt-1 font-medium pl-1">
            Reatime Typing Battle
          </p>
        </div>

        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-colors
          ${connected
            ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300'
            : 'bg-rose-900/20 border-rose-500/50 text-rose-300'
          }
        `}>
          {connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-xs font-bold tracking-wide">{connected ? "ONLINE" : "DISCONNECTED"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Controls & Profile */}
        <div className="lg:col-span-5 space-y-6">

          {/* Profile Card */}
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-purple-500/5 pointer-events-none" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-sky-500 rounded-full" />
              Your Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block ml-1">Player Name</label>
                <input
                  className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all font-medium"
                  placeholder="Enter your name..."
                  value={name}
                  onChange={(e) => { setName(e.target.value); multi.setName(e.target.value) }}
                />
              </div>

              <div className={`
                    col-span-2 group relative flex flex-col items-center justify-center w-20 h-20 rounded-xl border transition-all duration-300 overflow-hidden
                    ${mode.startsWith('practice') ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]' : 'bg-slate-800/30 border-slate-700/50'}
                  `}>
                {/* Layer 1: Default View (Icon + Label + Current Difficulty) - Always visible, just dimmed on hover */}
                <div className="flex flex-col items-center transition-all duration-300 group-hover:opacity-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`w-5 h-5 ${mode.startsWith('practice') ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${mode.startsWith('practice') ? 'text-slate-200' : 'text-slate-500'}`}>Practice</span>
                  </div>
                  <div className="px-2 py-0.5 rounded text-[10px] bg-slate-900/40 text-slate-400 font-mono border border-slate-700/50">
                    {mode.startsWith('practice') ? mode.split('-')[1].toUpperCase() : 'NORMAL'}
                  </div>
                </div>

                {/* Layer 2: Hover Controls (Difficulty Buttons) - Pops out */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] flex items-center justify-center gap-1.5 p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-20">
                  {/* Backdrop for the popout */}
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-600 shadow-2xl -z-10" />

                  {(['easy', 'normal', 'hard'] as const).map((d) => {
                    const m = `practice-${d}` as const
                    const isActive = mode === m
                    return (
                      <button
                        key={d}
                        onClick={(e) => { e.stopPropagation(); setMode(m) }}
                        className={`
                               flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all transform hover:scale-105 shadow-sm
                               ${isActive
                            ? d === 'hard' ? 'bg-rose-500 border-rose-400 text-white' : d === 'normal' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-sky-500 border-sky-400 text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                          }
                             `}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => setMode('flash')}
                className={`
                        col-span-2 relative flex flex-col items-center justify-center w-20 h-20 rounded-xl border transition-all duration-200
                        ${mode === 'flash'
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]'
                    : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/30'
                  }
                      `}
              >
                <div className="flex items-center gap-2">
                  <Zap className={`w-5 h-5 ${mode === 'flash' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${mode === 'flash' ? 'text-slate-200' : 'text-slate-500'}`}>Flash</span>
                </div>
              </button>
            </div>
          </div>

          {/* Room Controls - Only show if NOT in a room or if header for section */}
          {!room && (
            <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded-full" />
                Room Management
              </h2>

              <div className="space-y-4">
                <Button
                  onClick={handleCreateRoom}
                  disabled={!connected}
                  className="w-full py-4 text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none shadow-lg shadow-indigo-900/20"
                >
                  CREATE NEW ROOM
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-slate-900 text-slate-500">OR JOIN EXISTING</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-mono text-sm"
                      placeholder="Room ID"
                      value={roomIdInput}
                      onChange={(e) => setRoomIdInput(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleJoinRoom}
                    disabled={!connected || !name.trim() || !roomIdInput.trim()}
                    className="px-6 font-bold"
                  >
                    JOIN
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Lobby & Status */}
        <div className="lg:col-span-7">
          {room ? (
            <div className="h-full bg-slate-800/20 border border-slate-700/50 rounded-2xl p-0 overflow-hidden backdrop-blur-md flex flex-col">
              {/* Lobby Header */}
              <div className="p-6 border-b border-slate-700/50 bg-slate-900/40 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-bold tracking-wider mb-1">CURRENT ROOM</div>
                  <div className="text-3xl font-mono font-bold text-white tracking-widest flex items-center gap-3">
                    {room.roomId}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 border border-slate-600 align-middle tracking-normal font-sans">
                      ID
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {isInRoom && !gameStarted && (
                    <div className="animate-pulse">
                      <Button
                        onClick={() => { window.location.hash = mode.startsWith('practice') ? 'practice' : mode }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-none"
                      >
                        ENTER ROOM
                      </Button>
                    </div>
                  )}
                  {gameStarted && (
                    <div className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                      GAME IN PROGRESS
                    </div>
                  )}
                </div>
              </div>

              {/* Player List */}
              <div className="p-6 flex-1 bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Players ({sortedPlayers.length})</h3>
                <div className="space-y-3">
                  {sortedPlayers.map((p, index) => (
                    <div
                      key={p.id}
                      className="group flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 transition-all hover:bg-slate-800/60 hover:border-slate-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center font-black font-mono text-sm
                                ${index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                            index === 1 ? 'bg-slate-400/20 text-slate-400 border border-slate-400/30' :
                              index === 2 ? 'bg-orange-700/20 text-orange-700 border border-orange-700/30' :
                                'bg-slate-800 text-slate-600'}
                              `}>
                          {index + 1}
                        </div>
                        <div className="font-bold text-slate-200 text-lg">{p.name}</div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Score</div>
                          <div className="text-xl font-mono font-bold text-sky-400">{p.score}</div>
                        </div>
                        {/* Detailed stats hidden on mobile, visible on desktop */}
                        <div className="hidden sm:flex items-center gap-4 border-l border-slate-700/50 pl-4">
                          <div className="text-center">
                            <div className="text-[10px] text-emerald-500/70 font-bold uppercase">OK</div>
                            <div className="text-sm font-mono font-bold text-emerald-400">{p.correctCount}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-rose-500/70 font-bold uppercase">MISS</div>
                            <div className="text-sm font-mono font-bold text-rose-400">{p.mistakeCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {sortedPlayers.length === 0 && (
                    <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Waiting for players to join...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <div className="space-y-4 max-w-sm">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-300">Welcome to Multiplayer</h3>
                <p className="text-slate-500 leading-relaxed">
                  Create a room to host a match, or enter a Room ID to join an existing game. Real-time score updates and live status await!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
