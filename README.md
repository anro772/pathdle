# Pathdle

A League of Legends item-building quiz. A target item appears with its build path hidden: rebuild it from memory, component by component, before the timer runs out.

## Modes

| Mode | What it is |
|------|------------|
| **Daily** | The same 10 items for everyone each day (3 epic components, then 7 legendaries). One attempt; resumes if you leave, but the level you left counts as failed. Share a Wordle-style result. |
| **Endless** | 3 lives, ramping difficulty, global leaderboard. |
| **Practice** | No timer, no lives. Pick a pool (epics, legendaries, AD, AP, armor, boots…), retry wrong answers, reveal or skip. |

## How to play

1. The target item's components are hidden behind `?` slots. The first one is selected automatically; you only see how many parts it has and its combine cost.
2. Work out what it is and pick its recipe from the 4×4 shop, then press **Purchase**. A basic slot (e.g. Pickaxe) just needs that item.
   Stuck? **💡 Hint** (`H`) shows one of its stats per press (−25 points each, free in Practice), and **🔍 Peek** (`P`) reveals which component it is (1 per Endless run or Daily, unlimited in Practice).
3. Know the whole recipe? Click the target item (or press **B**) to **Buy All** base components at once for a ×1.5 bonus.
4. From level 6 a **gold check** asks what components cost. From level 10 it also asks the item's total cost.

A wrong purchase, a missed gold check or running out of time costs a life. Hints cost points but never break a perfect level.

### Extras

- **🧠 Bonus question**: after a level, name the champion who builds the item most in Challenger for +50.
  The top builder's splash art fades in behind the build path once you've answered.
- **💬 Tooltips**: hover (or long-press on phones) any item for its stats and passives.
- **📖 Codex**: every item you build perfectly is collected. Browse recipes and practice any item directly.
- **🏆 Achievements**: 16 badges (streaks, Buy Alls, gold checks, hidden gems, Dailies…). Endless and Daily count.
- **📊 Daily stats**: played, day streak, averages and a histogram of levels cleared.
- **Run recap & share image**: review every item of your run and save a PNG result card.
- **Installable**: add Pathdle to your home screen (web app manifest).

Progress (Codex, achievements, Daily history) is stored in the browser.

### Difficulty (Endless & Daily)

| Level | Targets | Timer | Gold check |
|-------|---------|-------|------------|
| 1–3 | Epic components | 30s | none |
| 4–5 | Legendaries | 30s | none |
| 6–7 | Legendaries | 30s | 1 component |
| 8–9 | Legendaries | 30s | 2 components |
| 10+ | Legendaries | 30s | 3 components + total cost |

The gold check gives 6s plus 3s per question (9s for one question, 18s for four).

### Scoring

`(100 + 10 × seconds left + 50 × correct gold answers) × 1.5 for Buy All × streak − 25 per hint`

The streak multiplier grows +0.1 per consecutive perfect level (max ×2). Timed-out levels score 0.

### Keyboard

| Key | Action |
|-----|--------|
| `1 2 3 4` / `Q W E R` / `A S D F` / `Z X C V` | Shop tiles (same layout as the grid) |
| `Enter` | Purchase / confirm / next level |
| `Backspace` | Remove the last cart item |
| `Tab`, `←` `→` | Switch component slot |
| `B` / `Esc` | Enter / leave Buy All |
| `H` | Hint (one stat of the hidden component, −25) |
| `P` | Peek (reveal the hidden component) |
| `V` / `Esc` | After a level: hide/show the results card to review the full build path |
| `1`–`8` | Gold check answers (pairs per question) |
| `1`–`3` | Bonus question (level-complete card) |

## Data

- **Items**: fetched live from Riot's DataDragon (no key needed) and cached in localStorage for 24h. `public/items-data.json` is the bundled fallback, refreshed on every `npm run build`.
- **Challenger meta snapshot** (`public/meta-data.json`): pick rate, win rate and top champions per item from ~170 recent EUW Challenger solo-queue games. It only powers the fun facts on the level-complete card. **It never changes which items can appear**, so rarely-built items are just as likely as meta ones. Regenerate with a (dev) Riot API key:
  ```bash
  RIOT_API_KEY=RGAPI-... npm run fetch-meta   # or put the key in .env
  ```
- **Leaderboard**: Supabase table `scores` (see `supabase/schema.sql`). Row-level security allows public reads and inserts only. The browser uses the publishable key; the secret key is never needed.
  A `score_plausible` check rejects scores above **1,850 × level**, the most a perfect player can earn per level (30s left, all gold answers, Buy All, ×2 streak, champion bonus). If you change scoring, update that constraint together with `MAX_POINTS_PER_LEVEL` in `src/utils/scoring.ts` (a test pins the value).

## Getting started

```bash
npm install
cp .env.example .env      # fill in Supabase URL + publishable key (and DB URL / Riot key for scripts)
npm run dev
```

| Script | |
|--------|---|
| `npm run dev` | Dev server |
| `npm run build` | Refresh items, type-check, build |
| `npm test` | Unit tests (Vitest), including full simulated Endless/Daily/Practice runs against real item data |
| `npm run lint` | ESLint |
| `npm run fetch-items` | Refresh the bundled DataDragon items |
| `npm run fetch-meta` | Rebuild the Challenger snapshot (needs `RIOT_API_KEY`) |
| `npm run apply-schema` | Apply `supabase/schema.sql` (needs `SUPABASE_DB_URL`) |

## Deploying

Pathdle is a static site, so any static host works (Vercel, Netlify, Cloudflare Pages…).

| Setting | Value |
|---|---|
| Build command | `npm run build` (fetches the latest items from DataDragon, so the build needs network access) |
| Output directory | `dist` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

- **Only** set the two `VITE_` variables on the host. Never add the Supabase secret key, `SUPABASE_DB_URL` or `RIOT_API_KEY`: anything starting with `VITE_` ends up in the browser bundle, and the others aren't needed at runtime.
- After the first deploy, change `og:image` and `twitter:image` in `index.html` to the full URL (e.g. `https://your-domain/og-image.png`). Discord and Twitter need an absolute URL for link previews.
- The Daily resets at 00:00 UTC for everyone.
- To refresh the Challenger stats: run `npm run fetch-meta` locally with a fresh Riot key, then commit and redeploy `public/meta-data.json`.

## Project structure

```
src/
├── components/        # MenuScreen, GameHeader, ComponentTree, ItemShopGrid, GoldCheckModal,
│                      # LevelCompleteCard, GameOverScreen, HowToPlay, FeedbackToast, ...
├── hooks/             # useHotkeys (keyboard), useGameEffects (timer + sounds)
├── stores/            # useGameStore: all game rules (Zustand)
├── services/          # RiotService (DataDragon), MetaService, LeaderboardService (Supabase)
├── utils/             # itemFilters, recipeEngine, shopGridGenerator, difficultySettings,
│                      # scoring, seededRandom (Daily), share, storage, sound
└── __tests__/
scripts/               # fetch-items, fetch-meta, apply-schema
supabase/schema.sql
```

## Tech stack

React 19 · TypeScript · Vite · Zustand · Framer Motion · Tailwind CSS v4 · Supabase · Vitest

## Credits

Item data and images from [Riot Games DataDragon](https://developer.riotgames.com/docs/lol#data-dragon). Inspired by [Loldle](https://loldle.net/). Pathdle isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.
