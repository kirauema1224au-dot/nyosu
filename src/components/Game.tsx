// src/components/Game.tsx

import { useEffect, useMemo, useState } from "react";
import type { Prompt } from "../api/prompts";
import { getTimeLimitSeconds } from "../utils/timeLimit";
import { useTypingStore } from "../store/useTypingStore";
import { progressRatio } from "../lib/stats";

type GameProps = {
  prompt: Prompt | null;                 // 現在のお題（nullのこともある）
  status: "idle" | "playing" | "finished"; // ゲーム状態（今の実装に合わせて調整してOK）
  onTimeUp: () => void;                  // 時間切れのとき呼びたい処理
};

export function Game({ prompt, status, onTimeUp }: GameProps) {
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Progress ratio for current input vs prompt length
  const input = useTypingStore((s) => s.input);
  const prog = useMemo(() => {
    const targetLen = prompt?.romaji.length ?? 0
    return progressRatio(input.length, targetLen)
  }, [input, prompt])

  // お題 or 状態が変わったときに制限時間を算出
  // → お題があるときは常に timeLimit は表示できるようにする
  //    カウントダウン(remaining)は playing のときだけセット
  useEffect(() => {
    if (!prompt) {
      setTimeLimit(null);
      setRemaining(null);
      setIsTimeUp(false);
      return;
    }

    const seconds = getTimeLimitSeconds(prompt);
    setTimeLimit(seconds);
    setIsTimeUp(false);

    if (status === "playing") {
      setRemaining(seconds);
    } else {
      setRemaining(null);
    }
  }, [prompt, status]);

  // カウントダウン処理
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
          onTimeUp(); // ★ 時間切れ
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [status, remaining, isTimeUp, onTimeUp]);

  return (
    <div className="space-y-3">
      {/* タイマー表示（常に制限時間は表示） */}
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
                  className={`absolute left-0 top-0 h-2 ${barClass} transition-[width] duration-300`}
                  style={{ width: `${ratio * 100}%` }}
                />
              )
            })()}
          </div>
        </div>
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
        <div className="text-xl font-bold">
          {prompt.text}
        </div>
      )}

      {/* 時間切れメッセージ */}
      {isTimeUp && (
        <div className="text-red-500 font-bold mt-2">
          時間切れ！
        </div>
      )}

      {/* ここに実際の入力UIをあとで組み込めばOK */}
    </div>
  );
}
