/**
 * Component Showcase - Manual validation page
 *
 * This file displays all Phase 3 UI components in isolation with mock data
 * to verify they render correctly before Phase 4 integration.
 *
 * To view: Update App.tsx to render this component temporarily
 */

import { Timer } from './components/Timer';
import { LivesDisplay } from './components/LivesDisplay';
import { GameOverScreen } from './components/GameOverScreen';
import { useGameStore } from './stores/useGameStore';
import { useEffect } from 'react';

export function ComponentShowcase() {
  // Set up mock state for testing
  useEffect(() => {
    useGameStore.setState({
      gameStatus: 'playing',
      livesRemaining: 2,
      timeRemaining: 7,
      currentLevel: 5,
      bestLevelReached: 8,
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-dark text-white p-8">
      <h1 className="text-4xl font-beaufort text-hextech-gold text-center mb-12">
        Buildle Component Showcase
      </h1>

      {/* Timer Component */}
      <section className="mb-12 p-6 bg-slate-medium rounded-lg border border-slate-light">
        <h2 className="text-2xl font-beaufort text-hextech-gold mb-4">Timer Component</h2>
        <div className="flex gap-8 items-center justify-center">
          <div>
            <p className="text-sm text-gray-400 mb-2">10 seconds (Blue)</p>
            <div onClick={() => useGameStore.setState({ timeRemaining: 10 })} className="cursor-pointer">
              <Timer />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">4 seconds (Yellow)</p>
            <div onClick={() => useGameStore.setState({ timeRemaining: 4 })} className="cursor-pointer">
              <Timer />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">1 second (Red + Pulse)</p>
            <div onClick={() => useGameStore.setState({ timeRemaining: 1 })} className="cursor-pointer">
              <Timer />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">Click each timer to activate that state</p>
      </section>

      {/* LivesDisplay Component */}
      <section className="mb-12 p-6 bg-slate-medium rounded-lg border border-slate-light">
        <h2 className="text-2xl font-beaufort text-hextech-gold mb-4">LivesDisplay Component</h2>
        <div className="flex gap-8 items-center justify-center">
          <div>
            <p className="text-sm text-gray-400 mb-2">3 Lives</p>
            <div onClick={() => useGameStore.setState({ livesRemaining: 3 })} className="cursor-pointer">
              <LivesDisplay />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">2 Lives</p>
            <div onClick={() => useGameStore.setState({ livesRemaining: 2 })} className="cursor-pointer">
              <LivesDisplay />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">1 Life</p>
            <div onClick={() => useGameStore.setState({ livesRemaining: 1 })} className="cursor-pointer">
              <LivesDisplay />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">0 Lives (Game Over)</p>
            <div onClick={() => useGameStore.setState({ livesRemaining: 0 })} className="cursor-pointer">
              <LivesDisplay />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">Click each display to activate that state</p>
      </section>

      {/* GameOverScreen Component */}
      <section className="mb-12 p-6 bg-slate-medium rounded-lg border border-slate-light">
        <h2 className="text-2xl font-beaufort text-hextech-gold mb-4">GameOverScreen Component</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">Normal Game Over (Level 5, Best 8)</p>
            <button
              onClick={() => useGameStore.setState({
                gameStatus: 'gameover',
                currentLevel: 5,
                bestLevelReached: 8
              })}
              className="px-4 py-2 bg-hextech-gold text-slate-dark rounded hover:bg-opacity-90"
            >
              Show Game Over (No Record)
            </button>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">New Record (Level 10, Best 8)</p>
            <button
              onClick={() => useGameStore.setState({
                gameStatus: 'gameover',
                currentLevel: 10,
                bestLevelReached: 10
              })}
              className="px-4 py-2 bg-hextech-gold text-slate-dark rounded hover:bg-opacity-90"
            >
              Show Game Over (NEW RECORD!)
            </button>
          </div>
          <div>
            <button
              onClick={() => useGameStore.setState({ gameStatus: 'playing' })}
              className="px-4 py-2 bg-slate-light text-white rounded hover:bg-opacity-80"
            >
              Hide Game Over Screen
            </button>
          </div>
        </div>
        <GameOverScreen />
      </section>

      {/* ItemShopGrid & ComponentTree Note */}
      <section className="mb-12 p-6 bg-slate-medium rounded-lg border border-slate-light">
        <h2 className="text-2xl font-beaufort text-hextech-gold mb-4">ItemShopGrid & ComponentTree</h2>
        <p className="text-gray-300 mb-4">
          These components require real game data (items from DataDragon API, component trees, etc.).
          They will be validated in Phase 4 when we integrate them with the full game flow.
        </p>
        <div className="space-y-2 text-sm text-gray-400">
          <p>✅ ItemShopGrid: Renders only when focusedComponentPath is set</p>
          <p>✅ ComponentTree: Renders only when targetItem exists</p>
          <p>✅ Both components are null-safe and compile without errors</p>
        </div>
      </section>

      {/* Validation Checklist */}
      <section className="p-6 bg-slate-medium rounded-lg border border-hextech-gold">
        <h2 className="text-2xl font-beaufort text-hextech-gold mb-4">Validation Checklist</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-light p-2 rounded">
            <input type="checkbox" className="w-5 h-5" />
            <span>Timer changes colors correctly (blue → yellow → red)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-light p-2 rounded">
            <input type="checkbox" className="w-5 h-5" />
            <span>Timer pulses when ≤2 seconds</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-light p-2 rounded">
            <input type="checkbox" className="w-5 h-5" />
            <span>LivesDisplay shows correct number of filled/empty hearts</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-light p-2 rounded">
            <input type="checkbox" className="w-5 h-5" />
            <span>GameOverScreen displays current and best levels</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-light p-2 rounded">
            <input type="checkbox" className="w-5 h-5" />
            <span>GameOverScreen shows ⭐ NEW RECORD when appropriate</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-light p-2 rounded">
            <input type="checkbox" className="w-5 h-5" />
            <span>All Hextech theme colors display correctly</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-light p-2 rounded">
            <input type="checkbox" className="w-5 h-5" />
            <span>Typography renders properly (Beaufort/Inter fonts)</span>
          </label>
        </div>
      </section>

      <div className="mt-8 text-center text-gray-400 text-sm">
        <p>Once validated, replace App.tsx content to proceed with Phase 4 integration</p>
      </div>
    </div>
  );
}
