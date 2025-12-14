// src/components/FlashGameMulti.tsx
// 瞬間判断タイピング用マルチプレイの部屋 & スコア共有 UI

import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
// socket connection is managed by useMultiStore
import { useMultiStore } from "../../store/useMultiStore";

type Player = {
  id: string;
  name: string;
  score: number;
  correctCount: number;
  mistakeCount: number;
};

type RoomState = {
  roomId: string;
  isStarted: boolean;
  players: Record<string, Player>;
};

// connection URL is managed by the store

export function FlashGameMulti({ defaultMode }: { defaultMode?: 'practice' | 'flash' } = {}) {
  // socket is managed centrally; no local ref needed
  const multi = useMultiStore()

  const connected = useMultiStore((s) => s.connected)
  const room = useMultiStore((s) => s.room)
  const gameStarted = useMultiStore((s) => s.started)
  const [mode, setMode] = useState<'practice' | 'flash'>(defaultMode ?? 'practice');
  const [name, setName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const isInRoom = useMultiStore((s) => s.isInRoom)

  // 自分のスコア情報
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);

  // --- 接続処理 ---
  useEffect(() => { multi.connect() }, [])

  // Multi overlay handles progress bridging; no local bridge here

  // --- ルーム作成 / 参加 / スタート ---

  const handleCreateRoom = () => {
    multi.createRoom(name.trim())
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

  // --- UI 用のプレイヤー一覧（スコア順にソート） ---
  const sortedPlayers: Player[] = room
    ? Object.values(room.players).sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 rounded-lg border border-slate-700 glass-surface text-slate-100">
      <h1 className="text-xl font-bold text-slate-100">瞬間判断タイピング・マルチ</h1>

      {/* 接続状態 */}
      <p className="text-sm text-slate-300">
        接続状態:{" "}
        <span className={connected ? "text-emerald-300" : "text-rose-300"}>
          {connected ? "🟢 接続中" : "🔴 未接続"}
        </span>
      </p>

      {/* 名前入力 */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">あなたの名前</label>
        <input
          className="w-full border border-slate-700 rounded px-2 py-1 text-sm bg-slate-900/50 text-slate-100 placeholder-slate-400"
          placeholder="例: うえま"
          value={name}
          onChange={(e) => { setName(e.target.value); multi.setName(e.target.value) }}
        />
      </div>

      {/* ルーム作成 & 参加 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <Button onClick={handleCreateRoom} disabled={!connected}>
          ルーム作成
        </Button>

        <div className="flex-1 space-y-1">
          <label className="block text-sm font-medium text-slate-200">ルームIDで参加</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-700 rounded px-2 py-1 text-sm bg-slate-900/50 text-slate-100 placeholder-slate-400"
              placeholder="例: ab3k9z"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
            />
            <Button onClick={handleJoinRoom} disabled={!connected || !name.trim() || !roomIdInput.trim()}>
              参加
            </Button>
          </div>
        </div>
      </div>

      {/* ルーム情報 */}
      {room && (
        <div className="border border-slate-700 rounded p-3 space-y-2 glass-surface">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-200">
              ルームID:{" "}
              <span className="font-mono font-semibold">{room.roomId}</span>
            </div>
            {isInRoom && !gameStarted && (
              <Button size="sm" onClick={handleStartGame}>
                ゲーム開始
              </Button>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-1 text-slate-100">参加者リスト</h2>
            <ul className="space-y-1 text-xs">
              {sortedPlayers.map((p, index) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-slate-900/40 border border-slate-700 rounded px-2 py-1 text-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center">
                      {index === 0 ? "👑" : index + 1}
                    </span>
                    <span>{p.name}</span>
                  </div>
                  <div className="font-mono">
                    🏆 {p.score} / ✅ {p.correctCount} / ❌ {p.mistakeCount}
                  </div>
                </li>
              ))}
              {sortedPlayers.length === 0 && (
                <li className="text-xs text-slate-400">
                  まだ参加者がいません。
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* モード選択（Practice / Flash） */}
      <div className="flex items-center gap-2">
        {(['practice','flash'] as const).map((m) => (
          <button
            key={m}
            className={`px-3 py-1.5 text-sm rounded border ${mode===m ? 'bg-cyan-600 text-white border-cyan-600' : 'border-slate-600 text-slate-200 hover:bg-slate-800/50'}`}
            onClick={() => setMode(m)}
          >
            {m === 'practice' ? 'Practice' : 'Flash'}
          </button>
        ))}
      </div>

      {/* 自分の状態 & デバッグ用ボタン */}
      {isInRoom && (
        <div className="border border-slate-700 rounded p-3 space-y-3 glass-surface">
          <h2 className="text-sm font-semibold text-slate-100">手順</h2>
          {!gameStarted ? (
            <p className="text-xs text-slate-300">全員がモードを合わせ、「ゲーム開始」で3秒後に開始します。開始後は各自の画面（Practice または Flash）に自動遷移します。</p>
          ) : (
            <p className="text-xs text-slate-300">ゲーム進行中です。右上のオーバーレイに順位が表示されます。</p>
          )}
        </div>
      )}
    </div>
  );
}
