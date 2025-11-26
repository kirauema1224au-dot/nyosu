// src/utils/timeLimit.ts
import type { Prompt } from "../api/prompts";

/**
 * 難易度と文字数から制限時間（秒）を決める
 * 好きに調整してOK
 */
export function getTimeLimitSeconds(prompt: Prompt): number {
  const { difficulty, text } = prompt;
  const length = text.length;

  if (difficulty < 400) {
    // 簡単なお題
    return 10 + Math.round(length * 0.2); // 例: 10秒 + 文字数×0.2
  } else if (difficulty < 650) {
    // ふつう
    return 10 + Math.round(length * 0.2);
  } else {
    // むずかしい
    return 10 + Math.round(length * 0.2);
  }
}
