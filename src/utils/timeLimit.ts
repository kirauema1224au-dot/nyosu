// src/utils/timeLimit.ts
import type { Prompt } from "../api/prompts";

/**
 * モードごと（easy/normal/hard）に難易度(difficulty)とromajiの文字数から制限時間（秒）を計算する
 */
export type TimeLimitMode = "easy" | "normal" | "hard";

/**
 * 各モードごとにパラメータを定義
 */
/**
 * timeLimitPresets:
 * モードごと（easy/normal/hard）に、romajiの文字数のみから制限時間を決めるための係数と上下限を定義します。
 * 難易度(difficulty)は参照しません。
 *
 * - perCharSec: 1文字ごとの秒数
 * - maxSeconds: 上限値
 */
const timeLimitPresets = {
  easy: {
    perCharSec: 0.5,
    maxSeconds: 45,
  },
  normal: {
    perCharSec: 0.4,
    maxSeconds: 34,
  },
  hard: {
    perCharSec: 0.3,
    maxSeconds: 20,
  },
} as const;

// difficulty には依存しないためバンド分けは廃止

/**
 * メイン: モードごとの制限時間計算
 */
export function getTimeLimitSeconds(
  prompt: Prompt,
  mode: TimeLimitMode = "easy"
): number {
  const { romaji } = prompt;
  // romajiの生の文字数で秒数を決定（記号やスペースも含める）
  const length = romaji.length;
  const preset = timeLimitPresets[mode];
  let seconds = length * preset.perCharSec;

  // 上限のみ適用（minSeconds は廃止）
  seconds = Math.min(preset.maxSeconds, seconds);

  // 丸め、UIの都合で（easy:5秒単位, normal:2秒単位, hard:1秒単位に丸める など）
  if (mode === "easy") {
    return Math.round(seconds);
  }
  if (mode === "normal") {
    return Math.round(seconds);
  }
  // hard
  return Math.round(seconds);
}
