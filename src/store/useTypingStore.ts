init: async () => {
  try {
    const prompts = await fetchPrompts()
    const current = pickRandomPrompt(prompts) ?? null

    set({
      prompts,
      current,
      input: '',
      mistakes: 0,
      startedAt: current ? performance.now() : null,
      finishedAt: null,
    })
  } catch (error) {
    console.error('init error: failed to load prompts from API', error)
    // ここではstateを初期状態にクリアしておくだけ
    set({
      prompts: [],
      current: null,
      input: '',
      mistakes: 0,
      startedAt: null,
      finishedAt: null,
    })
  }
},
