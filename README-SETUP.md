Adaptive Typing Game – Setup Notes

What was added
- TypeScript strict config: tsconfig.json
- Vite entry: index.html wired to /src/main.tsx
- React app: src/main.tsx, src/App.tsx
- State: src/store/useTypingStore.ts (Zustand)
- Utilities: src/lib/{typing,stats,difficulty}.ts
- Seed data + API shims: src/seed/seedPrompts.ts, src/api/prompts.ts
- UI: Header, Practice card (HUD/Prompt/Input), History chart (simple SVG placeholder)

Run
- npm run dev

Optional deps to install later
- Recharts (charting): npm i recharts
- Framer Motion (already present in node_modules per structure, optional use later)
- Zod (server-side validation later): npm i zod

Notes
- Tailwind is loaded via CDN in index.html. If you later switch to the Tailwind build pipeline, remove the CDN and add PostCSS config.
- The chart is a lightweight inline SVG so the app runs without extra deps. Replace with Recharts when ready.
- API calls are stubbed to fall back to local seeds if /api is not available yet.

