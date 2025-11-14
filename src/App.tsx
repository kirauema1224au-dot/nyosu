import React, { useEffect } from "react"
import { Header } from "./components/Header"
import { TypingCard } from "./components/Typing/Card"
import { HistoryChart } from "./components/HistoryChart"
import { useTypingStore } from "./store/useTypingStore"

export function App() {
  const init = useTypingStore((s) => s.init)
  const history = useTypingStore((s) => s.history)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <TypingCard />
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
