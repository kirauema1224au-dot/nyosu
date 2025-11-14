export function validateStrict(input: string, target: string): { prefixOK: boolean; completed: boolean } {
  const prefixOK = target.startsWith(input)
  const completed = input.length > 0 && input === target
  return { prefixOK, completed }
}

export function splitForHighlight(input: string, target: string) {
  const correctLen = commonPrefixLen(input, target)
  const correct = target.slice(0, correctLen)
  const next = target.slice(correctLen, correctLen + 1)
  const rest = target.slice(correctLen + 1)
  const isMistake = input.length > correctLen
  return { correct, next, rest, isMistake }
}

function commonPrefixLen(a: string, b: string) {
  let i = 0
  for (; i < a.length && i < b.length; i++) {
    if (a[i] !== b[i]) break
  }
  return i
}

