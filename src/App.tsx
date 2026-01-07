import { useEffect } from 'react';
import { useGameStore } from './stores/useGameStore';
import { Timer } from './components/Timer';
import { LivesDisplay } from './components/LivesDisplay';
import { ItemShopGrid } from './components/ItemShopGrid';
import { ComponentTree } from './components/ComponentTree';
import { GameOverScreen } from './components/GameOverScreen';
import './App.css';

function App() {
  const { gameStatus, startGame, timerActive, decrementTimer, handleTimerExpire } = useGameStore();

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      const state = useGameStore.getState();

      if (state.timeRemaining <= 0) {
        handleTimerExpire();
      } else {
        decrementTimer();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, decrementTimer, handleTimerExpire]);

  // Menu Screen
  if (gameStatus === 'menu') {
    return (
      <div className="min-h-screen bg-slate-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-beaufort text-hextech-gold mb-4">
            Buildle
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-md">
            Build League of Legends items from memory before the timer runs out!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-hextech-gold text-slate-dark text-xl font-bold rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-105"
          >
            START GAME
          </button>
          <div className="mt-12 text-sm text-gray-500">
            <p>• Click components to reveal what you need to build</p>
            <p>• Select items from the shop grid</p>
            <p>• Complete all components before time runs out</p>
          </div>
        </div>
      </div>
    );
  }

  // Playing Screen
  if (gameStatus === 'playing') {
    return (
      <div className="min-h-screen bg-slate-dark text-white p-8">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex justify-between items-center">
            <LivesDisplay />
            <Timer />
            <div className="text-right">
              <p className="text-sm text-gray-400">Level</p>
              <p className="text-3xl font-beaufort text-hextech-gold">
                {useGameStore.getState().currentLevel}
              </p>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Component Tree */}
          <div className="bg-slate-medium p-6 rounded-lg border border-slate-light">
            <h2 className="text-2xl font-beaufort text-hextech-gold mb-4">Target Item</h2>
            <ComponentTree />
          </div>

          {/* Right: Item Shop Grid */}
          <div className="bg-slate-medium p-6 rounded-lg border border-slate-light">
            <h2 className="text-2xl font-beaufort text-hextech-gold mb-4">Shop</h2>
            <ItemShopGrid />
          </div>
        </div>
      </div>
    );
  }

  // Game Over Screen
  return <GameOverScreen />;
}

export default App;
