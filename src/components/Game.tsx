// src/components/Game.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import type { Prompt } from "../api/prompts";
import { getTimeLimitSeconds } from "../utils/timeLimit";
import { useTypingStore } from "../store/useTypingStore";
import { progressRatio } from "../lib/stats";

type GameProps = {
  prompt: Prompt | null;                 // 現在のお題（nullのこともある）
  status: "idle" | "playing" | "finished"; // ゲーム状態（今の実装に合わせて調整してOK）
  onPromptTimeUp: () => void;            // お題の制限時間切れ
  onSessionTimeUp: () => void;           // セッション（2分）切れ
};

export function Game({ prompt, status, onPromptTimeUp, onSessionTimeUp }: GameProps) {
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [timeUpFired, setTimeUpFired] = useState(false);
  const timeBarRef = useRef<HTMLDivElement | null>(null);

  // Progress ratio for current input vs prompt length
  const input = useTypingStore((s) => s.input);
  const timeMode = useTypingStore((s) => s.timeMode);
  const sessionActive = useTypingStore((s) => s.sessionActive);
  const sessionEndsAt = useTypingStore((s) => s.sessionEndsAt);
  const setTimeMode = useTypingStore((s) => s.setTimeMode);
  const prog = useMemo(() => {
    const targetLen = prompt?.romaji.length ?? 0
    return progressRatio(input.length, targetLen)
  }, [input, prompt])

  // お題 or 状態が変わったときに制限時間を算出（セッション中でも表示）
  useEffect(() => {
    if (!prompt) {
      setTimeLimit(null);
      setRemaining(null);
      setIsTimeUp(false);
      setTimeUpFired(false);
      return;
    }
    const seconds = getTimeLimitSeconds(prompt, timeMode);
    setTimeLimit(seconds);
    setIsTimeUp(false);
    setTimeUpFired(false);

    if (status === "playing") {
      setRemaining(seconds);
    } else {
      setRemaining(null);
    }
  }, [prompt, status, timeMode]);

  // カウントダウン処理（お題用）
  useEffect(() => {
    if (status !== "playing") return;
    if (remaining == null) return;
    if (remaining <= 0) return;
    if (isTimeUp) return;

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          window.clearInterval(id);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [status, remaining, isTimeUp]);

  // 視覚のプログレスが100%到達してから onPromptTimeUp を発火（お題用）
  useEffect(() => {
    if (status !== "playing") return;
    if (!isTimeUp) return; // まだ時間切れ状態でない
    if (timeUpFired) return; // 既に発火済み

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setTimeUpFired(true);
      onPromptTimeUp();
    };

    const el = timeBarRef.current;
    // transitionend を待つ（width の変化）
    const handler = (e: TransitionEvent) => {
      if (e.propertyName === 'width') {
        finish();
      }
    };
    el?.addEventListener('transitionend', handler);

    // フォールバック（万一 transitionend が来ない場合）
    const fallback = window.setTimeout(finish, 400);

    return () => {
      el?.removeEventListener('transitionend', handler);
      window.clearTimeout(fallback);
    };
  }, [isTimeUp, status, onPromptTimeUp, timeUpFired]);

  return (
    <div className="space-y-3">
      {/* 難易度モード切り替え */}
      <div className="flex items-center gap-2">
        {([
          { label: "EASY", mode: "easy" },
          { label: "NORMAL", mode: "normal" },
          { label: "HARD", mode: "hard" },
        ] as const).map((b) => {
          const active = timeMode === b.mode
          const base = "px-3 py-1.5 text-sm rounded border transition-colors"
          const onClass = "bg-sky-500 text-white border-sky-500"
          const offClass = "border-slate-300 text-slate-600 hover:bg-slate-50"
          return (
            <button
              key={b.mode}
              type="button"
              disabled={sessionActive}
              className={`${base} ${active ? onClass : offClass} ${sessionActive ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={() => { if (!sessionActive) setTimeMode(b.mode) }}
            >
              {b.label}
            </button>
          )
        })}
      </div>
      {/* セッションの残り時間（中央表示） */}
      {sessionActive && sessionEndsAt && (
        <div className="py-2 flex flex-col items-center justify-center">
          <SessionText endsAt={sessionEndsAt} />
          <SessionPoints />
        </div>
      )}
      {/* お題の制限時間ゲージ（セッション中も表示） */}
      {timeLimit != null && (
        <div className="space-y-1">
          <div className="text-sm">
            制限時間: {timeLimit} 秒
            {remaining != null && (
              <>
                {" / 残り: "}
                <span
                  className={
                    remaining <= 5 ? "text-red-500 font-bold" : "font-semibold"
                  }
                >
                  {remaining} 秒
                </span>
              </>
            )}
          </div>
          {/* 残り時間ゲージ（Progress風） */}
          <div className="relative h-2 bg-slate-200 rounded overflow-hidden">
            {(() => {
              // 右からだんだん増える（経過率）
              const ratio = remaining == null
                ? 0
                : Math.max(0, Math.min(1, 1 - remaining / timeLimit))
              const low = remaining != null && remaining <= Math.max(5, Math.ceil(timeLimit * 0.15))
              const barClass = low ? "bg-red-500" : "bg-emerald-500"
              return (
                <div
                  ref={timeBarRef}
                  className={`absolute left-0 top-0 h-2 ${barClass} transition-[width] duration-300`}
                  style={{ width: `${ratio * 100}%` }}
                />
              )
            })()}
          </div>
        </div>
      )}

      {/* セッション用タイマー（UIは非表示、ロジックのみ稼働） */}
      {sessionActive && sessionEndsAt && (
        <SessionTimer endsAt={sessionEndsAt} onTimeUp={onSessionTimeUp} hidden />
      )}

      {/* Progress（タイムゲージの直下） */}
      {prompt && (
        <div className="space-y-1">
          <div className="text-xs text-slate-600">Progress</div>
          <div className="h-2 bg-slate-200 rounded overflow-hidden">
            <div
              className="h-2 bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${prog * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* お題表示 */} 
      {prompt && (
        <div className="text-xl font-bold pl-2">
          {prompt.text}
        </div>
      )}

      {/* 時間切れメッセージは非表示に変更 */}

      {/* ここに実際の入力UIをあとで組み込めばOK */}
    </div>
  );
}

function SessionTimer({ endsAt, onTimeUp, hidden }: { endsAt: number; onTimeUp: () => void; hidden?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const timeBarRef = useRef<HTMLDivElement | null>(null);
  const [fired, setFired] = useState(false);
  const total = 120; // seconds
  const remainingSec = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const ratio = Math.max(0, Math.min(1, 1 - (remainingSec / total)));

  useEffect(() => {
    if (now >= endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt, now]);

  useEffect(() => {
    if (remainingSec > 0) return;
    if (fired) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setFired(true);
      onTimeUp();
    };
    const el = timeBarRef.current;
    const handler = (e: TransitionEvent) => {
      if (e.propertyName === 'width') finish();
    };
    el?.addEventListener('transitionend', handler);
    const fallback = window.setTimeout(finish, 400);
    return () => {
      el?.removeEventListener('transitionend', handler);
      window.clearTimeout(fallback);
    };
  }, [remainingSec, onTimeUp, fired]);

  if (hidden) {
    return null
  }
  return (
    <div>
      <div className="text-sm">
        セッション残り: <span className={remainingSec <= 10 ? 'text-red-500 font-bold' : 'font-semibold'}>{remainingSec}</span> 秒
      </div>
      <div className="relative h-2 bg-slate-200 rounded overflow-hidden">
        <div ref={timeBarRef} className="absolute left-0 top-0 h-2 bg-slate-900 transition-[width] duration-300" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

function SessionText({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const totalSec = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return (
    <div className="text-3xl font-bold tabular-nums tracking-widest text-slate-800 timer-heartbeat">
      {mm}:{ss}
    </div>
  );
}

function SessionPoints() {
  const points = useTypingStore((s) => s.sessionStats.points)
  return (
    <div className="mt-1 text-sm font-semibold text-slate-700 tabular-nums">{points} pts</div>
  )
}
