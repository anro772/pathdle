# Pathdle

A League of Legends item building quiz game. Test your knowledge of item recipes and gold costs in this fast-paced memory challenge!

## How to Play

### Objective
Build League of Legends items by selecting the correct components before the timer runs out. Progress through increasingly difficult levels to achieve your highest score.

### Game Modes

#### Normal Mode
Click on any **Row 2 component slot** (the "?" boxes) to focus on building that component:
- Select the correct sub-components from the item shop
- At Level 6+, you must also select the correct combine cost (gold)
- Complete all Row 2 components to finish the level

#### Buy All Mode
Click on the **target item** (top item) to enter Buy All mode:
- Select ALL base components needed for the entire item at once
- Only base items appear in the shop (no tier 2 components)
- Great for skilled players who know the full build path
- Gold cost selection is skipped in this mode

### Difficulty Progression

| Level | Requirements |
|-------|-------------|
| 1-5 | Select correct components only |
| 6-10 | Select components + choose correct combine cost |
| 11+ | Components + combine cost + final total cost |

### Lives System
- Start with **3 lives** (hearts)
- Lose a life when:
  - You select wrong components
  - You choose the wrong gold cost
  - The timer runs out
- Game over when all lives are lost

### Helpful Features

#### Hints System
- Some sub-components are revealed with a lock icon
- These hints help disambiguate similar build paths
- Hint items are pre-selected and locked in your cart when you focus that component

#### Smart Slot Assignment
- For items with multiple basic components (like Plated Steelcaps = Boots + Cloth Armor)
- If you select the right item but for a different slot, it auto-assigns correctly
- Prevents frustration from "wrong slot" errors

#### Timer
- 20 seconds per level
- Color changes as time runs low (blue → yellow → red)
- Timer pauses when level is complete

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** for fast development
- **Zustand** for state management
- **Framer Motion** for animations
- **Tailwind CSS v4** for styling
- **Riot Games DataDragon API** for item data and images

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pathdle.git
cd pathdle

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
pathdle/
├── src/
│   ├── components/
│   │   ├── ComponentTree.tsx    # Build path visualization
│   │   ├── ItemShopGrid.tsx     # Item selection shop
│   │   ├── Timer.tsx            # Countdown timer
│   │   └── LivesDisplay.tsx     # Hearts display
│   ├── stores/
│   │   └── useGameStore.ts      # Zustand game state
│   ├── services/
│   │   └── RiotService.ts       # DataDragon API integration
│   ├── utils/
│   │   ├── recipeEngine.ts      # Build path tree generator
│   │   ├── itemFilters.ts       # Item filtering logic
│   │   └── shopGridGenerator.ts # Shop grid generation
│   ├── types/
│   │   └── items.ts             # TypeScript interfaces
│   ├── App.tsx                  # Main game container
│   └── App.css                  # Hextech theme styles
├── public/
│   └── items-data.json          # Cached item data
└── package.json
```

## Game Mechanics Deep Dive

### Component Tree Structure
- **Row 1**: Target legendary item (clickable for Buy All mode)
- **Row 2**: Direct components needed to build the target
- **Row 3**: Sub-components needed for each Row 2 item (if any)

### Validation Logic
1. **Items**: Must match exactly (including duplicates like 2x Long Sword)
2. **Gold (Level 6+)**: Must select the correct combine cost from 3 options
3. **Final Gold (Level 11+)**: Must know the total item cost after completing all components

### Data Source
All item data is fetched from Riot's DataDragon CDN:
- Automatically uses the latest game patch
- Caches data locally for faster subsequent loads
- Only includes Summoner's Rift items (excludes ARAM, TFT, etc.)

## Credits

- Item data and images from [Riot Games DataDragon](https://developer.riotgames.com/docs/lol#data-dragon)
- Inspired by [Loldle](https://loldle.net/) and similar LoL quiz games
- Hextech visual theme inspired by League of Legends client

## License

This project is for educational purposes. League of Legends and all related assets are property of Riot Games.
