// src/components/Game.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
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
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      {/* Session Timer (Central Display) */}
      {sessionActive && sessionEndsAt && (
        <div className="flex flex-col items-center justify-center -mt-2 mb-0 animate-in fade-in duration-500">
          <SessionText endsAt={sessionEndsAt} />
        </div>
      )}

      {/* Timer Bar (Per Prompt) */}
      {timeLimit != null && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-end px-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time Limit</div>
            <div className="text-xs font-mono font-medium text-slate-400 tabular-nums">
              {(() => {
                const remainingText = remaining == null ? '--' : Math.max(0, remaining).toString().padStart(2, '0')
                const limitText = timeLimit != null ? timeLimit.toString().padStart(2, '0') : '--'
                const danger = remaining != null && remaining <= 5
                return (
                  <>
                    <span className={`inline-block min-w-[3ch] text-right ${danger ? "text-rose-400 font-bold scale-110 transition-transform" : "text-slate-300"}`}>
                      {remainingText}
                    </span>
                    <span className="opacity-50 mx-1">/</span>
                    <span className="inline-block min-w-[3ch] text-right text-slate-400">{limitText}</span>
                    <span className="ml-1 text-slate-500">s</span>
                  </>
                )
              })()}
            </div>
          </div>
          {/* Progress Bar Container */}
          <div className="relative h-1.5 bg-slate-900/50 rounded-full overflow-hidden shadow-inner border border-slate-700/30">
            {(() => {
              const ratio = remaining == null
                ? 0
                : Math.max(0, Math.min(1, 1 - remaining / timeLimit))
              const low = remaining != null && remaining <= Math.max(5, Math.ceil(timeLimit * 0.15))
              const barClass = low ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              return (
                <div
                  ref={timeBarRef}
                  className={`absolute left-0 top-0 h-full ${barClass} transition-[width] duration-300 rounded-full`}
                  style={{ width: `${ratio * 100}%` }}
                />
              )
            })()}
          </div>
        </div>
      )}

      {/* Session Timer Logic (Hidden UI) */}
      {sessionActive && sessionEndsAt && (
        <SessionTimer endsAt={sessionEndsAt} onTimeUp={onSessionTimeUp} hidden />
      )}

      {/* Prompt Progress */}
      {prompt && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-end px-1 opacity-0 hover:opacity-100 transition-opacity">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Progress</div>
            <div className="text-[10px] font-mono text-slate-600">{(prog * 100).toFixed(0)}%</div>
          </div>
          <div className="relative h-1 bg-slate-900/50 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-[width] duration-200 ease-out rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
              style={{ width: `${prog * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Prompt Text Display */}
      {prompt && (
        <div className="py-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl rounded-full" />
          <div className="relative text-3xl sm:text-4xl font-extrabold text-slate-100 text-center mx-auto max-w-[42ch] leading-relaxed tracking-tight drop-shadow-md">
            {prompt.text}
          </div>
        </div>
      )}
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
      <div className="text-sm text-slate-200">
        セッション残り: <span className={remainingSec <= 10 ? 'text-rose-400 font-bold' : 'font-semibold text-slate-100'}>{remainingSec}</span> 秒
      </div>
      <div className="relative h-2 bg-slate-800 rounded overflow-hidden">
        <div ref={timeBarRef} className="absolute left-0 top-0 h-2 accent-bar transition-[width] duration-300" style={{ width: `${ratio * 100}%` }} />
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

  // Color logic for urgency
  const isUrgent = totalSec <= 10;

  return (
    <div className={`
      relative px-6 py-2 rounded-2xl border transition-all duration-300
      ${isUrgent
        ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
        : 'bg-slate-900/40 border-slate-700/50 shadow-lg'
      }
      backdrop-blur-md flex items-center gap-3 group
    `}>
      <div className={`p-1.5 rounded-full ${isUrgent ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
        <Clock className="w-4 h-4" />
      </div>
      <div className={`text-3xl font-black tabular-nums tracking-widest font-mono ${isUrgent ? 'text-rose-400' : 'text-slate-100'} timer-heartbeat`}>
        {mm}:{ss}
      </div>

      {/* Decorative ring */}
      <div className={`absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity border ${isUrgent ? 'border-rose-500/20' : 'border-emerald-500/20'}`} />
    </div>
  );
}

// End of file
