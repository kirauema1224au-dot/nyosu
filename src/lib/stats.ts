export function computeWPM(typedChars: number, msElapsed: number): number {
  if (msElapsed <= 0) return 0
  const words = typedChars / 5
  const minutes = msElapsed / 60000
  return Math.max(0, Math.round((words / minutes) * 10) / 10)
}

export function computeAccuracy(totalKeystrokes: number, mistakes: number): number {
  if (totalKeystrokes <= 0) return 100
  const correct = Math.max(0, totalKeystrokes - mistakes)
  const acc = (correct / totalKeystrokes) * 100
  return Math.round(acc * 10) / 10
}

export function progressRatio(inputLen: number, targetLen: number): number {
  if (targetLen <= 0) return 0
  return Math.min(1, Math.max(0, inputLen / targetLen))
}

