# Buildle - League of Legends Item Crafting Speedrun Game

**Design Document**
*Date: 2026-01-06*
*Status: Approved for Implementation*

---

## 1. Project Overview

**Name:** Buildle
**Type:** Browser-based React minigame
**Concept:** A speed-memory game where players build League of Legends Legendary items by progressively unlocking components in a nested tree structure before a timer expires.

**Core Loop:**
1. Random Legendary item appears with locked component tree
2. Player focuses a component slot to reveal required sub-items
3. Player selects correct items from shop grid + enters gold values (based on difficulty)
4. Component unlocks, repeat for all components
5. Complete item before timer runs out

**Key Differentiator:** Progressive nested component unlocking with difficulty scaling from pure item selection to full gold memorization.

---

## 2. Tech Stack & Architecture

### Technology Choices

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (dark mode, Hextech LoL aesthetic)
- **State Management:** Zustand (lightweight global state)
- **Animations:** Framer Motion (spring physics, smooth transitions)
- **Data Source:** Riot Games DataDragon API (no backend)
- **Audio:** None for MVP (can be added in polish phase)

### Project Structure

```
buildle/
├── src/
│   ├── services/
│   │   └── RiotService.ts          # DataDragon API + caching
│   ├── stores/
│   │   └── useGameStore.ts         # Zustand game state
│   ├── utils/
│   │   ├── recipeEngine.ts         # Recursive tree builder
│   │   └── itemFilters.ts          # DataDragon filtering logic
│   ├── components/
│   │   ├── ComponentTree.tsx       # Nested hierarchy display
│   │   ├── ItemShopGrid.tsx        # League-style item selector
│   │   ├── Timer.tsx               # Countdown display
│   │   ├── LivesDisplay.tsx        # Heart icons (3 lives)
│   │   └── GameOverScreen.tsx      # Stats + best run
│   ├── types/
│   │   └── items.ts                # TypeScript interfaces
│   └── App.tsx                     # Main game container
├── docs/
│   └── plans/
│       └── 2026-01-06-buildle-design.md
└── package.json
```

---

## 3. Core Data Layer

### RiotService.ts - DataDragon Integration

**Endpoints:**
- Version list: `https://ddragon.leagueoflegends.com/api/versions.json`
- Item data: `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`
- Item images: `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`

**Smart Caching Strategy:**

```typescript
// On app load:
1. Check localStorage for cached version + item data
2. Fetch latest version from DataDragon
3. If cached version !== latest[0]:
   - Fetch new item.json
   - Store in localStorage with version key: "buildle-items-{version}"
4. Use cached data for instant subsequent loads
```

**Item Filtering Logic:**

```typescript
// Valid Legendary items (target pool):
const isValidLegendary = (item: ItemData, id: string): boolean => {
  return (
    item.maps['11'] === true &&              // Summoner's Rift only
    item.gold.purchasable === true &&        // Can be bought
    !item.description?.includes('Ornn') &&   // Exclude Ornn items
    parseInt(id) < 7000 &&                   // Exclude Arena/TFT
    item.from && item.from.length > 0        // Has components (Legendary)
  );
};

// Basic components (shop pool):
const isBasicComponent = (item: ItemData): boolean => {
  return (
    item.maps['11'] === true &&
    item.gold.purchasable === true &&
    !item.description?.includes('Ornn') &&
    parseInt(id) < 7000 &&
    (!item.from || item.from.length === 0)   // NO build path (atomic)
  );
};
```

**Note:** During implementation, manually verify all filtered items to ensure no edge cases slip through.

---

## 4. Recipe Engine - Core Algorithm

### recipeEngine.ts - Building the Component Tree

**Data Structure:**

```typescript
interface ComponentNode {
  itemId: string;           // Item ID from DataDragon
  itemName: string;         // Display name
  children: ComponentNode[]; // Sub-components (empty for atomics)
  goldCost: number;         // Combine cost (what you ADD to components)
  totalCost: number;        // Full item value (for Level 11+ validation)
}
```

**Recursive Tree Builder:**

```typescript
function buildComponentTree(itemId: string, allItems: Record<string, ItemData>): ComponentNode {
  const item = allItems[itemId];

  if (!item.from || item.from.length === 0) {
    // Base case: atomic component (Longsword, Ruby Crystal, etc.)
    return {
      itemId,
      itemName: item.name,
      children: [],
      goldCost: 0,
      totalCost: item.gold.total
    };
  }

  // Recursive case: has sub-components
  const children = item.from.map(subId => buildComponentTree(subId, allItems));

  // Calculate combine cost (total - sum of component costs)
  const componentsCost = children.reduce((sum, child) => sum + child.totalCost, 0);

  return {
    itemId,
    itemName: item.name,
    children,
    goldCost: item.gold.total - componentsCost,
    totalCost: item.gold.total
  };
}
```

**Example Output for Youmuu's Ghostblade:**

```typescript
{
  itemId: "3142",
  itemName: "Youmuu's Ghostblade",
  totalCost: 2800,
  goldCost: 675,  // Final combine cost
  children: [
    {
      itemId: "3134",  // Serrated Dirk
      itemName: "Serrated Dirk",
      totalCost: 1100,
      goldCost: 300,
      children: [
        { itemId: "1036", itemName: "Long Sword", totalCost: 350, goldCost: 0, children: [] },
        { itemId: "1036", itemName: "Long Sword", totalCost: 350, goldCost: 0, children: [] }
      ]
    },
    {
      itemId: "3123",  // Rectrix
      itemName: "Rectrix",
      totalCost: 775,
      goldCost: 425,
      children: [
        { itemId: "1036", itemName: "Long Sword", totalCost: 350, goldCost: 0, children: [] }
      ]
    },
    {
      itemId: "1036",  // Direct Long Sword
      itemName: "Long Sword",
      totalCost: 350,
      goldCost: 0,
      children: []
    }
  ]
}
```

---

## 5. Game State Management

### useGameStore.ts - Zustand Store

```typescript
interface GameState {
  // Game Status
  gameStatus: 'menu' | 'playing' | 'gameover';
  currentLevel: number;
  livesRemaining: 3 | 2 | 1 | 0;

  // Current Challenge
  targetItem: ComponentNode;              // The tree to build
  focusedComponentPath: number[];         // Active slot path (e.g., [0, 1])
  unlockedComponents: Set<string>;        // Which slots are complete

  // Player Input
  selectedItems: string[];                // Items clicked from shop
  goldInput: string;                      // Typed gold value

  // Timer
  timeRemaining: number;                  // Seconds left
  timerActive: boolean;

  // Progression
  bestLevelReached: number;               // localStorage persisted

  // Difficulty Gates
  requiresComponentGold: boolean;         // Level 6+
  requiresFinalGold: boolean;             // Level 11+

  // Actions
  startGame: () => void;
  focusComponent: (path: number[]) => void;
  selectShopItem: (itemId: string) => void;
  submitPurchase: () => void;
  loseLife: () => void;
  autoCompleteComponent: (path: number[]) => void;
  advanceLevel: () => void;
  resetGame: () => void;
}
```

**Key Behaviors:**
- `focusedComponentPath: [0]` = Dirk (first child of Youmuu's)
- `focusedComponentPath: [0, 1]` = Second Longsword within Dirk
- Timer pauses for 1.5s when showing wrong answer feedback
- Level gates update automatically on level change

---

## 6. UI Components Breakdown

### ComponentTree.tsx - Nested Hierarchy Display

**Visual Layout:**

```
Row 1 (Always Visible):
┌─────────────────────────────────┐
│     [Youmuu's Ghostblade Icon]  │
│         2800g (if Level 11+)    │
└─────────────────────────────────┘

Row 2 (Component Slots):
┌────┬────┬────┬────┐
│ ?  │ ?  │ ?  │675g│  ← Click to focus
└────┴────┴────┴────┘
  Dirk  Rect  LS  Combine

Row 3 (Sub-components - Only when Row 2 focused):
  ↓ (Dirk focused)
┌────┬────┐
│ ?  │ ?  │  ← Dirk's sub-components
└────┴────┘
  300g (if Level 6+)
```

**Component States:**
- **Locked/Unfocused:** Gray box with "?" icon, subtle pulse animation
- **Focused:** Gold glowing border (Hextech style), Row 3 appears if has children
- **Unlocked:** Shows actual item icon + green checkmark corner badge
- **Auto-completed (wrong answer):** Red flash → slide in correct icon with animation

### ItemShopGrid.tsx - League-Style Item Selector

**Layout:**

```
┌─────────────────────────────────────┐
│  BUILDING: [Dirk Icon]             │  ← Header
├─────────────────────────────────────┤
│  [Item] [Item] [Item] [Item]       │
│  [Item] [Item] [Item] [Item]       │  ← 4x4 Grid (16 items)
│  [Item] [Item] [Item] [Item]       │
│  [Item] [Item] [Item] [Item]       │
├─────────────────────────────────────┤
│  Selected: [LS x2] [Empty]         │  ← Cart with quantity overlays
│  Gold: [___] (if Level 6+)         │  ← Input field
│         [BUY COMPONENT]             │  ← Submit button
└─────────────────────────────────────┘
```

**Item Card Design (League-style):**

```
┌──────────┐
│  [Icon]  │  ← Item image from DataDragon
│ ──────── │
│ Long     │  ← Item name (truncated if needed)
│ Sword    │
│  350g    │  ← Gold cost (Hextech gold color)
└──────────┘
```

**Interactions:**
- Click item → Bounces (framer-motion spring)
- Adds to "Selected" cart with x2, x3 overlay if clicked multiple times
- BUY button disabled until requirements potentially met
- Grid randomizes positions each level

**Grid Composition (16 items total):**
- Correct items needed for focused component (e.g., 2x Longsword)
- ~12-14 distractors (mixed AD/AP/Tank/Support basic components)
- Randomized positions

### Timer.tsx - Countdown Display

**Visual:**
- Large numerical countdown (48px font)
- Color changes based on urgency:
  - 10-6s: White/Blue (calm)
  - 5-3s: Yellow (warning)
  - 2-0s: Red + pulse animation (urgent)

**Behavior:**
- Counts down from 10 seconds (fixed for MVP)
- Pauses for 1.5s when showing wrong answer feedback
- Triggers game over / life loss when reaches 0

### LivesDisplay.tsx - Hearts

**Simple display:**
- ❤️❤️❤️ (3 filled hearts at start)
- Empty heart when life lost (e.g., 🖤❤️❤️)
- Clean, readable, no animations needed

### GameOverScreen.tsx - Stats Display

**Layout:**

```
┌─────────────────────────────────┐
│        GAME OVER                │
│                                 │
│   THIS RUN:                     │
│   Level Reached: 8              │
│                                 │
│   BEST EVER:                    │
│   Level Reached: 12  ⭐         │
│                                 │
│   [PLAY AGAIN]                  │
└─────────────────────────────────┘
```

**localStorage Persistence:**

```typescript
interface SavedStats {
  bestLevelReached: number;
}

// On game over:
const currentBest = parseInt(localStorage.getItem('buildle-best-level') || '0');
if (currentLevel > currentBest) {
  localStorage.setItem('buildle-best-level', currentLevel.toString());
  // Show "NEW RECORD!" animation
}
```

---

## 7. Game Flow & Logic

### Level Start Flow

```typescript
1. Pick random Legendary item from filtered pool (full RNG)
2. Build component tree with buildComponentTree()
3. Initialize state:
   - Lives unchanged from previous level
   - Timer = 10 seconds
   - All component slots locked
   - Update difficulty gates based on level:
     * Level 1-5: requiresComponentGold = false, requiresFinalGold = false
     * Level 6-10: requiresComponentGold = true, requiresFinalGold = false
     * Level 11+: requiresComponentGold = true, requiresFinalGold = true
4. Render ComponentTree (Row 1 + Row 2 visible, Row 3 hidden)
5. Start countdown timer
```

### Player Interaction Loop

```typescript
1. Click a gray [?] slot in Row 2 → focusComponent()
   - Highlight slot with gold glow
   - If slot has children: Show Row 3 (sub-components) below
   - Render ItemShopGrid with 16 items (correct items + distractors)

2. Click items from shop → selectShopItem()
   - Bouncy animation on click
   - Add to selectedItems array
   - Cart shows selected items with quantity overlays (x2, x3, etc.)

3. Type gold value (if Level 6+) → Update goldInput state

4. Click BUY COMPONENT → submitPurchase()

   Validation:
   - Check if selected items match required items (correct IDs and quantities)
   - Check if goldInput matches goldCost (if Level 6+)

   IF CORRECT:
   - Green flash animation on component slot
   - If has children: Row 3 slots auto-fill with correct icons
   - Parent slot (Row 2) unlocks to show component icon + checkmark
   - Row 3 disappears
   - Clear selectedItems and goldInput
   - Unfocus component
   - Check if all Row 2 slots unlocked → Proceed to Level Complete flow

   IF WRONG:
   - Red shake animation on component slot
   - Lose 1 life (livesRemaining--)
   - Pause timer for 1.5 seconds
   - Show correct answer briefly (items flash, gold shows)
   - Auto-complete ONLY this component slot (unlock with correct icon)
   - Clear selection and unfocus
   - Resume timer
   - If livesRemaining === 0 → Game Over

5. Repeat for next component slot until all unlocked
```

### Timer Expiration

```typescript
When timer reaches 0:
1. Lose 1 life
2. Auto-complete ALL remaining locked component slots
3. Show correct answers briefly
4. If livesRemaining > 0:
   - Advance to next level
5. If livesRemaining === 0:
   - Game Over
```

### Level Complete Flow

```typescript
When all Row 2 slots are unlocked:

IF Level 11+:
  1. Show final gold input field for total item cost
  2. Prompt: "Enter total item value to complete"
  3. Player types totalCost (e.g., 2800 for Youmuu's)
  4. Click COMPLETE ITEM button
  5. Validate totalCost input

     IF CORRECT:
     - Success animation
     - Advance to next level

     IF WRONG:
     - Lose 1 life
     - Show correct total cost value
     - If livesRemaining > 0: Auto-complete and advance
     - If livesRemaining === 0: Game Over

ELSE (Level < 11):
  1. Success animation
  2. Auto-advance to next level immediately
```

### Game Over Flow

```typescript
Triggered when: livesRemaining === 0

1. Stop timer
2. Set gameStatus = 'gameover'
3. Calculate stats:
   - currentLevel (level reached)
4. Check if new record:
   - If currentLevel > bestLevelReached:
     * Update localStorage
     * Show "NEW RECORD!" badge
5. Render GameOverScreen with stats
6. Player clicks PLAY AGAIN → Reset game state, start at Level 1
```

---

## 8. Difficulty Progression

### Level-Based Requirement Gates

```typescript
const getDifficultySettings = (level: number) => {
  return {
    // Timer (fixed for MVP, tune later)
    timerDuration: 10,

    // Gold input requirements
    requiresComponentGold: level >= 6,   // Levels 6+: type component gold
    requiresFinalGold: level >= 11,      // Levels 11+: also type total item cost

    // Grid (fixed for MVP)
    shopGridSize: 16,  // 4x4 grid

    // Item pool (full RNG)
    itemPool: 'all-legendaries',  // Random selection from all Legendary items
  };
};
```

**Progression Summary:**

| Level Range | Component Selection | Component Gold | Final Gold (Total Cost) |
|-------------|---------------------|----------------|------------------------|
| 1-5         | ✅ Click items      | ❌ Auto-filled | ❌ Auto-filled         |
| 6-10        | ✅ Click items      | ✅ Type gold   | ❌ Auto-filled         |
| 11+         | ✅ Click items      | ✅ Type gold   | ✅ Type total cost     |

**Difficulty naturally increases due to:**
- More mental load (memorizing gold values)
- Full RNG means unpredictable item complexity (some Legendaries have 2 components, others have 5+)
- Cumulative pressure (fewer lives remaining as game progresses)

---

## 9. Animations & Visual Feedback

### Framer Motion Animations

**Item Click (Shop Grid):**
```typescript
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  animate={{
    y: isSelected ? [0, -10, 0] : 0  // Bounce on select
  }}
  transition={{ type: "spring", stiffness: 400, damping: 10 }}
/>
```

**Component Slot Unlock (Correct Answer):**
```typescript
<motion.div
  initial={{ scale: 0, rotate: -180 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: "spring", duration: 0.6 }}
>
  {/* Item icon with green checkmark overlay */}
</motion.div>
```

**Wrong Answer Shake:**
```typescript
<motion.div
  animate={{ x: [-10, 10, -10, 10, 0] }}
  transition={{ duration: 0.4 }}
>
  {/* Component slot with red flash background */}
</motion.div>
```

**Row 3 Appearance (Focus Component):**
```typescript
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Sub-component slots */}
</motion.div>
```

**Timer Color Change:**
```typescript
const getTimerColor = (seconds: number) => {
  if (seconds > 5) return 'text-blue-400';      // 10-6s: Calm
  if (seconds > 2) return 'text-yellow-400';    // 5-3s: Warning
  return 'text-red-500';                        // 2-0s: Urgent
};

// Add pulse animation when < 3s
{timeRemaining <= 2 && (
  <motion.div
    animate={{ scale: [1, 1.1, 1] }}
    transition={{ repeat: Infinity, duration: 0.5 }}
  />
)}
```

### Visual State Summary

| Element | State | Visual Treatment |
|---------|-------|------------------|
| Component Slot | Locked | Gray box, "?" icon, subtle pulse |
| Component Slot | Focused | Gold glowing border (Hextech style) |
| Component Slot | Unlocked | Item icon + green checkmark badge |
| Component Slot | Auto-completed (wrong) | Red flash → correct icon slides in |
| Shop Item | Idle | Default card styling |
| Shop Item | Hovered | Scale 1.05 |
| Shop Item | Selected | Bounce animation + quantity badge |
| Timer | 10-6s | Blue/White, normal size |
| Timer | 5-3s | Yellow, normal size |
| Timer | 2-0s | Red, pulse animation |

---

## 10. Styling & Theme

### Tailwind Configuration - LoL "Hextech" Aesthetic

```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'hextech-gold': '#C89B3C',     // LoL gold accent
        'hextech-blue': '#0BC6E3',     // Ability blue
        'slate-dark': '#010A13',       // LoL client dark bg
        'slate-medium': '#1E2328',     // Card backgrounds
        'slate-light': '#3C3C41',      // Borders
        'error-red': '#D13639',        // Wrong answer
        'success-green': '#0BDA51',    // Correct answer
      },
      fontFamily: {
        'lol': ['Beaufort for LOL', 'serif'],  // Official LoL font (fallback to serif)
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'hextech': '0 0 20px rgba(12, 198, 227, 0.3)',
        'gold': '0 0 20px rgba(200, 155, 60, 0.4)',
      }
    }
  },
  plugins: [],
};
```

### Design Patterns

**Color Scheme:**
- Background: Dark (`slate-dark`, `slate-medium`)
- Primary accent: Hextech gold (`#C89B3C`)
- Interactive elements: Hextech blue (`#0BC6E3`)
- Feedback: Green for success, red for errors

**Component Styling:**
- Item cards: Dark background (`slate-medium`), gold borders on hover
- Component slots: Hexagonal borders where possible (or rounded squares)
- Glowing effects: Box-shadows for focused/interactive states
- Depth: Layered shadows for card-style layouts

**Typography:**
- Headings: Beaufort for LOL (if available, otherwise serif fallback)
- Body text: Inter / clean sans-serif
- Item names: 14px, medium weight
- Gold values: Bold, hextech-gold color
- Timer: 48px, bold, dynamic color
- Level counter: Top-left corner, subtle display

**Layout:**
- Desktop-only (1280px+ optimal)
- Centered layout with max-width container
- Component tree at top, shop grid below, timer/lives in header

---

## 11. Implementation Roadmap

### Phase 1: Core Data Layer (Build & Test First)

**Tasks:**
- [ ] Set up Vite + React + TypeScript project
- [ ] Install dependencies:
  - `zustand` (state management)
  - `framer-motion` (animations)
  - `tailwindcss` (styling)
- [ ] Create `RiotService.ts`:
  - Implement version fetching
  - Implement item.json fetching
  - Add smart caching with localStorage
  - Build item filtering functions (Legendary vs Basic Components)
- [ ] Create `recipeEngine.ts`:
  - Implement `buildComponentTree()` recursive function
  - Add TypeScript interfaces (`ComponentNode`, etc.)
- [ ] **Unit test the tree builder:**
  - Test with known items (Youmuu's, Infinity Edge, Trinity Force)
  - Verify gold calculations are correct
  - Verify tree depth and structure

**Validation Checkpoint:** Ensure DataDragon data loads correctly and tree builder produces accurate structures before proceeding.

---

### Phase 2: State Management

**Tasks:**
- [ ] Create `useGameStore.ts` with Zustand
- [ ] Define all TypeScript interfaces:
  - `GameState`
  - `ComponentNode`
  - `ItemData` (DataDragon response)
- [ ] Implement core actions:
  - `startGame()`
  - `focusComponent(path: number[])`
  - `selectShopItem(itemId: string)`
  - `submitPurchase()`
  - `loseLife()`
  - `autoCompleteComponent(path: number[])`
  - `advanceLevel()`
  - `resetGame()`
- [ ] Add difficulty gate logic:
  - Update `requiresComponentGold` and `requiresFinalGold` based on `currentLevel`
- [ ] Implement localStorage persistence:
  - Save/load `bestLevelReached`
  - Update on game over

**Validation Checkpoint:** Test state transitions in isolation (can use React DevTools).

---

### Phase 3: UI Components (Bottom-up)

**Tasks:**
- [ ] Set up Tailwind config with Hextech theme colors
- [ ] Create base components:
  - **Timer.tsx:** Countdown display with color changes
  - **LivesDisplay.tsx:** Heart icons (❤️ x3)
- [ ] Create **ItemShopGrid.tsx:**
  - League-style item cards (icon, name, gold)
  - 4x4 grid layout
  - Click handling (add to selected items)
  - Cart display with quantity overlays
  - Gold input field (conditional on difficulty)
  - BUY button
- [ ] Create **ComponentTree.tsx:**
  - Row 1: Target item display
  - Row 2: Component slots (gray boxes / unlocked icons)
  - Row 3: Sub-component slots (conditional rendering)
  - Focus state highlighting
  - Unlock animations
- [ ] Create **GameOverScreen.tsx:**
  - Display current run stats
  - Display best ever stats
  - New record badge (conditional)
  - Play Again button

**Validation Checkpoint:** Verify each component renders correctly in isolation (use Storybook or manual testing).

---

### Phase 4: Game Logic Integration

**Tasks:**
- [ ] Wire up level generation:
  - Random Legendary item selection from filtered pool
  - Call `buildComponentTree()` to create target
  - Initialize game state for new level
- [ ] Implement purchase validation logic:
  - Compare `selectedItems` with required items (check IDs and quantities)
  - Validate `goldInput` against `goldCost` (if Level 6+)
  - Validate final `totalCost` (if Level 11+ and all components unlocked)
- [ ] Add wrong answer flow:
  - Trigger shake animation
  - Call `loseLife()`
  - Pause timer for 1.5s
  - Call `autoCompleteComponent()` for failed slot
  - Resume timer
  - Check for game over condition
- [ ] Add level completion flow:
  - Check if all Row 2 slots unlocked
  - If Level 11+: Prompt for final gold input
  - If Level < 11: Auto-advance
  - Call `advanceLevel()`
- [ ] Implement timer logic:
  - Countdown from 10s
  - Pause on wrong answer
  - Trigger life loss on expiration
  - Auto-complete remaining slots on timeout

**Validation Checkpoint:** Playtest full game loop (Level 1 → 5 → 11+) to ensure all mechanics work correctly.

---

### Phase 5: Animations & Polish

**Tasks:**
- [ ] Add Framer Motion to all interactions:
  - Item click bounce (shop grid)
  - Slot unlock animation (scale + rotate)
  - Wrong answer shake
  - Row 3 appear/disappear transitions
- [ ] Implement timer urgency animations:
  - Color changes (blue → yellow → red)
  - Pulse animation at < 3s
- [ ] Add visual feedback:
  - Green checkmark on unlocked slots
  - Red flash on wrong answer
  - Gold glow on focused slots
  - Quantity overlays (x2, x3) on selected items
- [ ] Polish UI:
  - Hover states on buttons
  - Smooth transitions between game states
  - Loading state while fetching DataDragon data

**Validation Checkpoint:** Ensure animations feel smooth and don't interfere with gameplay speed.

---

### Phase 6: Testing & Tuning

**Tasks:**
- [ ] **Manually verify filtered items:**
  - Check that all Legendary items are valid (no Ornn items, no TFT/Arena items)
  - Verify basic components pool contains all expected items
- [ ] Test edge cases:
  - Items with only 1 component
  - Items with 5+ components (e.g., Trinity Force)
  - Items with duplicate sub-components (e.g., 2x Longsword)
- [ ] Balance testing:
  - Test if 10s timer feels right (adjust if too easy/hard)
  - Verify difficulty gates (Levels 1, 6, 11+) feel appropriate
  - Check if 3 lives is balanced
- [ ] Bug testing:
  - Test localStorage persistence (clear cache, reload)
  - Test wrong answer auto-complete for all component types
  - Test timer pause/resume on wrong answer
  - Test game over flow
- [ ] Cross-browser testing:
  - Chrome, Firefox, Safari, Edge
  - Verify DataDragon CORS works
  - Check Framer Motion performance

**Validation Checkpoint:** Game is fully playable with no critical bugs.

---

## 12. Future Enhancements (Post-MVP)

**Features to consider after core implementation:**

- **Sound Effects:**
  - LoL TP channel sound (start timer)
  - Purchase success sound
  - Wrong answer buzzer
  - Level up fanfare

- **Keyboard Shortcuts:**
  - Number keys (1-9) to select grid items
  - Enter to submit purchase
  - Escape to unfocus/reset

- **Advanced Stats:**
  - Accuracy percentage
  - Total games played
  - Longest streak (consecutive correct items)
  - Time-based leaderboard (fastest to Level X)

- **Game Modes:**
  - Practice Mode (no timer, no lives, just learn items)
  - Endless Mode (current implementation)
  - Challenge Mode (specific item sets, time trials)

- **Visual Enhancements:**
  - TP particle effects around timer
  - Hextech-style borders and patterns
  - Custom LoL-themed cursor
  - Item rarity tiers (highlight Mythic items differently)

- **Mobile Responsiveness:**
  - Adapt layout for tablets
  - Touch-optimized controls
  - Simplified grid for smaller screens

- **Social Features:**
  - Share score to Twitter/Discord
  - Global leaderboard (requires backend)
  - Daily challenges

---

## 13. Technical Notes

### DataDragon Considerations

- **Version updates:** New patches release every ~2 weeks. Cache invalidation happens automatically with version check.
- **CORS:** DataDragon allows cross-origin requests, no proxy needed.
- **Rate limiting:** No official limits, but use caching to be respectful.
- **Item ID stability:** Item IDs can change between major patches. Cached data handles this via version key.

### Performance Optimization

- **Lazy load images:** Use `loading="lazy"` for item icons in shop grid
- **Memoize tree builder:** Cache built trees for items already processed in session
- **Zustand middleware:** Use `persist` middleware for localStorage (future enhancement)
- **Framer Motion:** Use `layoutId` for smooth transitions between states

### Accessibility Considerations (Future)

- **Keyboard navigation:** Tab through component slots and shop items
- **Screen reader support:** Proper ARIA labels for all interactive elements
- **Color-blind mode:** Don't rely solely on red/green for feedback (add icons/text)
- **Focus indicators:** Clear visual focus states for all clickable elements

---

## 14. Success Criteria

**The implementation is complete when:**

1. ✅ Player can start a game and see a random Legendary item with locked component slots
2. ✅ Player can focus a component slot and see the shop grid with 16 items
3. ✅ Player can select items from the shop and see them in the cart with quantity overlays
4. ✅ Player can type gold values (at Level 6+) and submit purchase
5. ✅ Correct purchases unlock component slots with animations
6. ✅ Wrong purchases lose a life, auto-complete the component, and pause timer briefly
7. ✅ Timer counts down from 10s and triggers life loss on expiration
8. ✅ All Row 2 slots unlocking advances to next level (or prompts for final gold at Level 11+)
9. ✅ Game over screen shows current run level and best ever level (persisted to localStorage)
10. ✅ Player can click "Play Again" to restart at Level 1
11. ✅ Difficulty gates work correctly (Levels 1-5, 6-10, 11+)
12. ✅ All animations feel smooth and don't interfere with gameplay
13. ✅ DataDragon caching works (instant load after first fetch)
14. ✅ No critical bugs in core game loop

---

## Conclusion

Buildle is a unique League of Legends minigame that tests item crafting knowledge through progressive unlocking and timed pressure. The modular architecture (data layer → state → UI → logic → polish) ensures a solid foundation for future enhancements.

**Ready for implementation!** 🎮
