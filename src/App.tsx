import React, { useEffect } from "react"
import { Header } from "./components/Header"
import { TypingCard } from "./components/Typing/Card"
import { Progress } from "./components/Progress"
// import { HistoryChart } from "./components/HistoryChart"
import { useTypingStore } from "./store/useTypingStore"
// import { Game } from "./components/Game"
import { ToastProvider } from './components/ui/Toast'
import { Modal } from './components/ui/Modal'
import { Button } from './components/ui/Button'
import { SideFlashButton } from './components/SideFlashButton'
import { FlashGame } from './components/Flash/FlashGame'
import { FlashGameMulti } from './components/Typing/FlashGameMulti'
import { MultiOverlay } from './components/Multi/Overlay'
import { GameSelector } from './components/GameSelector'

function useHashRoute() {
  const [hash, setHash] = React.useState<string>(() => (typeof location !== 'undefined' ? location.hash : ''))
  useEffect(() => {
    const onChange = () => setHash(location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const route = hash.replace(/^#/, '') || 'home'
  return route as 'home' | 'flash' | 'flash-multi' | 'multi' | 'practice'
}

export function App() {
  // Force HMR check
  const route = useHashRoute()
  const init = useTypingStore((s) => s.init)
  const current = useTypingStore((s) => s.current)
  const prompts = useTypingStore((s) => s.prompts)

  // 画面表示時に一度だけ API からお題を読み込む
  useEffect(() => {
    void init()
  }, [])

  // prompts が空 & current も null のときは、まだ読み込み中とみなす
  const isLoading = !current && prompts.length === 0

  const [helpOpen, setHelpOpen] = React.useState(false)

  // トップページ（home）はセレクターを表示
  if (route === 'home') {
    return (
      <div className="min-h-screen">
        <Header route={route} onOpenHelp={() => setHelpOpen(true)} />
        <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
          <GameSelector />
        </main>
      </div>
    )
  }

  // 各ゲームモード
  return (
    <div className="min-h-screen">
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => location.hash = ''}
          className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors backdrop-blur-md"
        >
          ← MENU
        </button>
      </div>

      <Header route={route} onOpenHelp={() => setHelpOpen(true)} />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <ToastProvider>
          <MultiOverlay />
          {route === 'flash' ? (
            <FlashGame />
          ) : route === 'flash-multi' ? (
            // 既存の flash-multi は Multi ロビー（Flash デフォルト）にフォールバック
            <FlashGameMulti defaultMode="flash" />
          ) : route === 'multi' ? (
            <FlashGameMulti defaultMode="practice" />
          ) : (
            <>
              {isLoading ? (
                // ① まだ init 中（APIから取得中）
                <div className="rounded-lg border border-slate-700 glass-surface p-4 text-sm text-slate-200">
                  お題を読み込み中です…
                </div>
              ) : !current ? (
                // ② APIは返したが current が取れなかった場合
                <div className="rounded-lg border border-slate-700 glass-surface p-4 text-sm text-rose-400">
                  お題が取得できませんでした。API と DB の中身を確認してください。
                </div>
              ) : (
                // ③ お題が取れているときだけ TypingCard を表示
                <TypingCard />
              )}
              <Progress />
            </>
          )}
          <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="遊び方">
            <p className="text-sm leading-6">
              Start ボタンで 2 分のセッションが始まります。表示されたお題をローマ字でタイプし、Enter で確定（完全一致なら自動で次へ）。Esc でスキップ。
            </p>
            <div className="mt-3 text-sm text-slate-200">
              <div className="font-semibold mb-1">スコア（2分チャレンジ）</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>基本ポイント（難易度）: EASY 100 / NORMAL 150 / HARD 200</li>
                <li>無ミスボーナス: +10（その問題でミス0の場合）</li>
                <li>ミスペナルティ: -3 × ミス数（その問題のミス数に応じて）</li>
                <li>ポイントは1問ごとに加算されます（セッション中は難易度変更できません）</li>
              </ul>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" onClick={() => setHelpOpen(false)}>閉じる</Button>
            </div>
          </Modal>
        </ToastProvider>
      </main>
    </div>
  )
}

export default App
