import React, { useEffect } from "react"
import { Header } from "./components/Header"
import { TypingCard } from "./components/Typing/Card"
import { HistoryChart } from "./components/HistoryChart"
import { useTypingStore } from "./store/useTypingStore"

export function App() {
  const init = useTypingStore((s) => s.init)
  const history = useTypingStore((s) => s.history)
  const current = useTypingStore((s) => s.current)
  const prompts = useTypingStore((s) => s.prompts)

  // 画面表示時に一度だけ API からお題を読み込む
  useEffect(() => {
    void init()
  }, [init])

  // prompts が空 & current も null のときは、まだ読み込み中とみなす
  const isLoading = !current && prompts.length === 0

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {isLoading ? (
          // ① まだ init 中（APIから取得中）
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
            お題を読み込み中です…
          </div>
        ) : !current ? (
          // ② APIは返したが current が取れなかった場合
          <div className="rounded-lg border bg-white p-4 text-sm text-red-500">
            お題が取得できませんでした。API と DB の中身を確認してください。
          </div>
        ) : (
          // ③ お題が取れているときだけ TypingCard を表示
          <TypingCard />
        )}

        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Progress</h2>
            <span className="text-xs text-slate-500">
              WPM (green) / Accuracy% (blue)
            </span>
          </div>
          <HistoryChart data={history} />
        </div>
      </main>
    </div>
  )
}

export default App
