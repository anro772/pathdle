# Pathdle Testing Guide

## Quick Start Testing

```bash
npm run dev
# Open http://localhost:5173
```

---

## Test Scenarios

### 1. Menu Screen ✅

**Expected:**
- [ ] "Pathdle" title displays in Hextech gold
- [ ] Game description shows
- [ ] Instructions visible (3 bullet points)
- [ ] START GAME button is clickable
- [ ] Button has hover effect (scale + opacity)

---

### 2. Game Initialization (Level 1) ✅

**After clicking START GAME:**

- [ ] Menu disappears
- [ ] Timer starts at 10 seconds (blue color)
- [ ] Lives display shows ❤️❤️❤️ (3 hearts)
- [ ] Level shows "1" in top-right
- [ ] Target item displays in ComponentTree
- [ ] Row 2 shows locked component slots (gray "?")
- [ ] Shop grid is initially hidden (no focused component)

---

### 3. Component Focusing ✅

**Click a gray "?" slot in Row 2:**

- [ ] Slot gets gold border/glow (focused state)
- [ ] Shop grid appears on the right
- [ ] Shop grid shows 16 items
- [ ] Items display: icon, name, gold cost
- [ ] Cart section shows empty slots (dashes "-")
- [ ] Gold input field is hidden (Level 1)
- [ ] BUY button displays

---

### 4. Item Selection ✅

**Click items in shop grid:**

- [ ] First click adds item to cart
- [ ] Clicking same item multiple times shows quantity (e.g., "Long Sword x2")
- [ ] Cart fills up to required number of items
- [ ] Items are selectable multiple times (duplicates allowed)

---

### 5. Correct Purchase (Level 1-5) ✅

**Select correct items and click BUY:**

- [ ] Focused slot unlocks
- [ ] Slot shows actual item icon
- [ ] Green checkmark (✓) appears on unlocked slot
- [ ] Cart clears
- [ ] Focus clears (shop grid hides)
- [ ] Can click another locked slot to continue

**When all Row 2 slots unlocked:**
- [ ] Short delay (500ms)
- [ ] New level loads
- [ ] Timer resets to 10 seconds
- [ ] Lives remain the same
- [ ] Level number increments
- [ ] New random target item appears

---

### 6. Wrong Purchase ✅

**Select wrong items/gold and click BUY:**

- [ ] Life lost (heart goes from ❤️ to 🖤)
- [ ] Timer pauses for 1.5 seconds
- [ ] Failed slot auto-completes (shows correct item + checkmark)
- [ ] Cart clears
- [ ] Focus clears
- [ ] Timer resumes
- [ ] Can continue with remaining components

**At 0 lives:**
- [ ] Game over screen appears
- [ ] Shows "Level Reached: X"
- [ ] Shows best level
- [ ] PLAY AGAIN button visible

---

### 7. Timer Countdown ✅

**Watch the timer:**

- [ ] Counts down 1 second at a time
- [ ] Color at 10s: Hextech Blue (cyan)
- [ ] Color at 4s: Yellow (warning)
- [ ] Color at 2s: Error Red (urgent)
- [ ] Pulse animation appears at ≤2 seconds
- [ ] Timer pauses during wrong answer delay

**When timer reaches 0:**
- [ ] Life lost automatically
- [ ] Remaining components auto-complete
- [ ] If lives > 0: Advance to next level
- [ ] If lives = 0: Game over screen

---

### 8. Level 6+ (Component Gold) ✅

**Reach Level 6:**

- [ ] Gold input field appears in shop
- [ ] Must enter component's combine cost
- [ ] BUY validates both items AND gold
- [ ] Wrong gold = life lost + auto-complete

---

### 9. Level 11+ (Final Gold) ✅

**Reach Level 11:**

- [ ] After all Row 2 components unlocked
- [ ] Game prompts for final gold input
- [ ] Must enter total item cost
- [ ] Correct: Advance to next level
- [ ] Wrong: Life lost + advance anyway

---

### 10. Row 3 Sub-components ✅

**Focus a Row 2 component that has children:**

- [ ] Row 3 appears below Row 2
- [ ] Shows sub-component slots
- [ ] Can click sub-component slots to focus them
- [ ] Shop grid updates with sub-component requirements
- [ ] Unlocking sub-components unlocks parent
- [ ] Row 3 hides when parent is unlocked

---

### 11. Game Over & Restart ✅

**Reach game over:**

- [ ] Modal overlay appears
- [ ] Shows "GAME OVER" title
- [ ] Shows "THIS RUN: Level Reached: X"
- [ ] Shows "BEST EVER: Level Reached: Y"
- [ ] Star (⭐) appears if new record
- [ ] "NEW RECORD!" badge shows if current > best
- [ ] localStorage saves best level

**Click PLAY AGAIN:**
- [ ] Returns to menu screen
- [ ] Best level persists (check after refresh)

---

## Edge Cases to Test

### Component Tree

- [ ] Items with 2 components work (e.g., Boots of Speed)
- [ ] Items with 3+ components work (e.g., Trinity Force)
- [ ] Items with nested components work (e.g., Youmuu's → Dirk → Long Swords)
- [ ] Items with only gold cost work (e.g., Basic items)

### Shop Grid

- [ ] Always shows exactly 16 items
- [ ] Contains all required items (no missing correct answers)
- [ ] Distractors are valid basic components
- [ ] Grid randomizes on each level

### State Persistence

- [ ] Best level persists after browser refresh
- [ ] Best level persists across different sessions
- [ ] localStorage updates on new records

### Responsive Design

- [ ] Works on mobile (single column layout)
- [ ] Works on tablet (2-column layout)
- [ ] Works on desktop (wide layout)
- [ ] Text is readable at all sizes

---

## Known Issues / Bugs to Watch For

### Phase 2 Fixes Already Applied:
- ✅ Race condition in level advancement (fixed with isTransitioning)
- ✅ localStorage persistence (fixed with STORAGE_KEY constant)
- ✅ Missing Level 11+ final gold (fixed with submitFinalGold)
- ✅ Timer doesn't pause properly (fixed with timerActive flag)

### Potential Issues to Test:
- [ ] Timer cleanup on unmount (check for memory leaks)
- [ ] Multiple rapid clicks on BUY button
- [ ] Selecting more items than needed
- [ ] Browser back button behavior
- [ ] Network errors loading bundled items
- [ ] Invalid item data in bundle

---

## Performance Testing

- [ ] Initial load time < 2 seconds
- [ ] Level transitions smooth (no jank)
- [ ] Timer countdown precise (not drifting)
- [ ] No memory leaks after 10+ levels
- [ ] Items bundle loads instantly (cached)

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces timer
- [ ] Screen reader announces lives remaining
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG standards

---

## Next Steps After Testing

If all tests pass:
- ✅ Proceed to Phase 5 (Animations & Polish)

If issues found:
1. Document bugs in GitHub issues
2. Prioritize by severity (Critical → Minor)
3. Fix critical bugs before Phase 5
4. Minor polish can wait for Phase 5

---

## Manual Test Commands

```bash
# Start dev server
npm run dev

# Fetch latest items (if needed)
npm run fetch-items

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Automated Testing (Future)

**Not yet implemented:**
- Unit tests for store actions
- Component tests with React Testing Library
- E2E tests with Playwright/Cypress
- Visual regression tests

These can be added in Phase 6 if desired.
