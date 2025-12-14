// src/store/useTypingStore.ts
import { create } from "zustand";
import type { Prompt, RoundResult } from "../types";
import { fetchPrompts } from "../api/prompts";
import { validateStrict, isAcceptedRomaji, prefixOKVariants } from "../lib/typing";
import { computeAccuracy, computeWPM } from "../lib/stats";
// Target Difficulty ロジックは廃止

// --- TimeMode 定義の一時的解決（本来は utils で export すべき）---
export type TimeMode = "easy" | "normal" | "hard";

// ランダムに次のお題を1つ選ぶ（現在のお題IDは除外）
function pickRandomPrompt(
  prompts: Prompt[],
  currentId?: number | null
): Prompt | null {
  if (prompts.length === 0) return null;

  const candidates =
    currentId != null
      ? prompts.filter((p) => p.id !== currentId)
      : prompts;

  const pool = candidates.length > 0 ? candidates : prompts;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

type State = {
  prompts: Prompt[];
  current: Prompt | null;
  input: string;
  mistakes: number;
  startedAt: number | null;
  finishedAt: number | null;
  history: RoundResult[];
  timeMode: TimeMode;
  // Session mode (2-minute challenge)
  sessionActive: boolean;
  sessionStartedAt: number | null;
  sessionEndsAt: number | null;
  sessionDifficulty: TimeMode | null;
  sessionStats: {
    promptsSolved: number;
    totalMistakes: number;
    promptsTimedOut: number;
    points: number;
  };
};

type Actions = {
  init: () => Promise<void>;
  setInput: (s: string) => void;
  submitIfComplete: () => void;
  nextPrompt: () => void;
  skip: () => void;
  setTimeMode: (mode: TimeMode) => void;
  // Session actions
  startSession: (seconds: number) => void;
  endSession: () => void;
  // Mark current prompt as timed out (count + move next)
  timeUpPrompt: () => void;
};

const initialState: State = {
  prompts: [],
  current: null,
  input: "",
  mistakes: 0,
  startedAt: null,
  finishedAt: null,
  history: [],
  timeMode: "easy",
  sessionActive: false,
  sessionStartedAt: null,
  sessionEndsAt: null,
  sessionDifficulty: null,
  sessionStats: {
    promptsSolved: 0,
    totalMistakes: 0,
    promptsTimedOut: 0,
    points: 0,
  },
};

// ★ ここが大事：export const useTypingStore（名前付きエクスポート）
export const useTypingStore = create<State & Actions>()((set, get) => ({
  ...initialState,

  // API からお題を読み込んで初期化
  init: async () => {
    try {
      const prompts = await fetchPrompts();

      // お題が1件も取れなかった場合のケア
      if (!prompts || prompts.length === 0) {
        set({
          prompts: [],
          current: null,
          input: "",
          mistakes: 0,
          startedAt: null,
          finishedAt: null,
        });
        return;
      }

      // 1件以上あればランダムに1つ選ぶ
      const current = pickRandomPrompt(prompts) ?? prompts[0];

      set({
        prompts,
        current,
        input: "",
        mistakes: 0,
        startedAt: null,
        finishedAt: null,
      });
    } catch (error) {
      console.error("init error: failed to load prompts from API", error);
      // エラー時はいったん初期状態に戻す
      set({
        prompts: [],
        current: null,
        input: "",
        mistakes: 0,
        startedAt: null,
        finishedAt: null,
      });
    }
  },

  setInput: (s: string) => {
    const { current, input, startedAt } = get();
    if (!current) return;

    const prev = input;
    const next = s;

    // Compute edit type
    const isAdding = next.length > prev.length;
    const isDeleting = next.length < prev.length;
    const isSameLength = next.length === prev.length && next !== prev;

    // For additions and same-length edits, enforce variant-aware prefix check
    if (isAdding || isSameLength) {
      const prefixOK = prefixOKVariants(next, current.romaji);
      if (!prefixOK) {
        // Count a mistake immediately and reflect to session total if active
        set((prev) => ({
          mistakes: prev.mistakes + 1,
          ...(prev.sessionActive
            ? {
                sessionStats: {
                  ...prev.sessionStats,
                  totalMistakes: prev.sessionStats.totalMistakes + 1,
                },
              }
            : {}),
        }));
        try { window.dispatchEvent(new Event('typing:practice-mistake')) } catch {}
        // Do not update input (block the change)
        return;
      }
    }

    // If deleting or prefix check passed, apply the update
    set((prev) => ({
      input: next,
      mistakes: prev.mistakes,
      startedAt: startedAt ?? performance.now(),
    }));
  },

  submitIfComplete: () => {
    const { current, input, mistakes, startedAt, sessionActive, sessionDifficulty } = get();
    if (!current || !startedAt) return;

    const completed = isAcceptedRomaji(input, current.romaji);
    if (!completed) return;

    try { window.dispatchEvent(new Event('typing:practice-correct')) } catch {}

    const finishedAt = performance.now();
    const ms = finishedAt - startedAt;
    const wpm = computeWPM(input.length, ms);
    const accuracy = computeAccuracy(input.length, mistakes);

    const entry: RoundResult = {
      promptId: current.id,
      wpm,
      accuracy,
      timestamp: Date.now(),
    };

    const history = [...get().history, entry].slice(-100);

    // Update session stats if active
    if (sessionActive) {
      const base = (() => {
        switch (sessionDifficulty) {
          case 'hard': return 200;
          case 'normal': return 150;
          case 'easy':
          default: return 100;
        }
      })();
      const bonusOrPenalty = mistakes === 0 ? 10 : -(3 * mistakes);
      const reward = base + bonusOrPenalty;
      set((prev) => ({
        history,
        finishedAt,
        sessionStats: {
          promptsSolved: prev.sessionStats.promptsSolved + 1,
          // totalMistakes is now updated per mistake immediately
          totalMistakes: prev.sessionStats.totalMistakes,
          promptsTimedOut: prev.sessionStats.promptsTimedOut,
          points: prev.sessionStats.points + reward,
        },
      }));
    } else {
      set({
        history,
        finishedAt,
      });
    }

    get().nextPrompt();
  },

  nextPrompt: () => {
    const { prompts, current } = get();
    const next = pickRandomPrompt(prompts, current?.id) ?? null;

    set({
      current: next,
      input: "",
      mistakes: 0,
      startedAt: null,
      finishedAt: null,
    });
  },

  skip: () => {
    get().nextPrompt();
  },

  // お題の制限時間切れ時の処理：セッション統計に加算して次へ
  timeUpPrompt: () => {
    const { sessionActive } = get();
    if (sessionActive) {
      set((prev) => ({
        sessionStats: {
          ...prev.sessionStats,
          promptsTimedOut: prev.sessionStats.promptsTimedOut + 1,
        },
      }));
    }
    try { window.dispatchEvent(new Event('typing:practice-timeout')) } catch {}
    get().nextPrompt();
  },

  setTimeMode: (mode: TimeMode) => {
    const { sessionActive } = get();
    // セッション中は難易度変更を無効化
    if (sessionActive) return;
    set({ timeMode: mode });
  },

  startSession: (seconds: number) => {
    const endsAt = Date.now() + seconds * 1000;
    const modeAtStart = get().timeMode;
    set({
      sessionActive: true,
      sessionStartedAt: Date.now(),
      sessionEndsAt: endsAt,
      sessionDifficulty: modeAtStart,
      sessionStats: {
        promptsSolved: 0,
        totalMistakes: 0,
        promptsTimedOut: 0,
        points: 0,
      },
    });
  },

  endSession: () => {
    const { sessionActive, sessionStartedAt, sessionStats, sessionDifficulty } = get();
    if (!sessionActive || !sessionStartedAt) {
      set({ sessionActive: false, sessionStartedAt: null, sessionEndsAt: null, sessionDifficulty: null });
      return;
    }
    const record = {
      startedAt: sessionStartedAt,
      endedAt: Date.now(),
      promptsSolved: sessionStats.promptsSolved,
      totalMistakes: sessionStats.totalMistakes,
      sessionDifficulty: sessionDifficulty ?? 'easy',
      promptsTimedOut: sessionStats.promptsTimedOut,
      points: sessionStats.points,
    };
    try {
      const key = 'typing:sessions';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) as any[] : [];
      arr.push(record);
      // Keep last 200 records
      const trimmed = arr.slice(-200);
      localStorage.setItem(key, JSON.stringify(trimmed));
      // 保存完了イベントを通知（Progressで即時反映させる）
      try {
        window.dispatchEvent(new CustomEvent('typing:sessions-updated', { detail: record }));
      } catch {}
    } catch (e) {
      console.warn('failed to save session record', e);
    }
    // 終了後も直近表示用に sessionDifficulty は保持し、次回 startSession で上書きする
    set({ sessionActive: false, sessionStartedAt: null, sessionEndsAt: null });
  },
}));
