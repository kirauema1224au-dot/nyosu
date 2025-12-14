export function validateStrict(input: string, target: string): { prefixOK: boolean; completed: boolean } {
  const prefixOK = target.startsWith(input)
  const completed = input.length > 0 && input === target
  return { prefixOK, completed }
}

// --- Romaji variants acceptance (for practice/flash) ---

export function isAcceptedRomaji(input: string, canonical: string): boolean {
  const v = input.trim().toLowerCase()
  const canon = canonical.trim().toLowerCase()
  if (v === canon) return true
  const set = new Set(generateRomajiVariants(canon, 256))
  return set.has(v)
}

export function prefixOKVariants(input: string, canonical: string): boolean {
  const v = input.toLowerCase()
  const canon = canonical.toLowerCase()
  if (canon.startsWith(v)) return true
  const vars = generateRomajiVariants(canon, 256)
  for (const s of vars) {
    if (s.startsWith(v)) return true
  }
  return false
}

export function bestMatchVariantForHighlight(input: string, canonical: string): string {
  const canon = canonical.toLowerCase()
  const v = input.toLowerCase()
  const candidates = [canon, ...generateRomajiVariants(canon, 256)]
  let best = canon
  let bestLen = commonPrefixLen(v, canon)
  for (const c of candidates) {
    const l = commonPrefixLen(v, c)
    if (l > bestLen) { best = c; bestLen = l }
    if (bestLen === v.length) break
  }
  return best
}

export function generateRomajiVariants(s: string, cap = 256): string[] {
  type Rule = { pat: string; alts: string[] }
  const rules: Rule[] = [
    { pat: 'sha', alts: ['sha','sya','shya'] },
    { pat: 'shu', alts: ['shu','syu','shyu'] },
    { pat: 'sho', alts: ['sho','syo','shyo'] },
    { pat: 'ja',  alts: ['ja','jya','zya'] },
    { pat: 'ju',  alts: ['ju','jyu','zyu'] },
    { pat: 'jo',  alts: ['jo','jyo','zyo'] },
    { pat: 'shi', alts: ['shi','si'] },
    { pat: 'chi', alts: ['chi','ti','ci'] },
    { pat: 'tsu', alts: ['tsu','tu'] },
    { pat: 'ji',  alts: ['ji','zi'] },
    { pat: 'fu',  alts: ['fu','hu'] },
    { pat: 'zzi', alts: ['jji'] },
  ]
  const out: string[] = []
  const memo = new Map<string, string[]>()
  const helper = (rest: string): string[] => {
    if (memo.has(rest)) return memo.get(rest)!
    if (out.length > cap) return []
    if (rest.length === 0) return ['']
    for (const rule of rules) {
      if (rest.startsWith(rule.pat)) {
        const tails = helper(rest.slice(rule.pat.length))
        const arr: string[] = []
        for (const alt of rule.alts) {
          for (const t of tails) {
            const v = alt + t
            arr.push(v)
            if (out.length + arr.length > cap) break
          }
          if (out.length + arr.length > cap) break
        }
        memo.set(rest, arr)
        return arr
      }
    }
    const tails = helper(rest.slice(1))
    const arr = tails.map((t) => rest[0] + t)
    memo.set(rest, arr)
    return arr
  }
  const res = helper(s)
  const uniq: string[] = []
  const seen = new Set<string>()
  for (const r of res) {
    if (!seen.has(r)) {
      seen.add(r)
      uniq.push(r)
      if (uniq.length >= cap) break
    }
  }
  return uniq
}

export function splitForHighlight(input: string, target: string) {
  // choose the variant that matches the current input best
  const variant = bestMatchVariantForHighlight(input, target)
  const correctLen = commonPrefixLen(input.toLowerCase(), variant.toLowerCase())
  const correct = variant.slice(0, correctLen)
  const next = variant.slice(correctLen, correctLen + 1)
  const rest = variant.slice(correctLen + 1)
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
