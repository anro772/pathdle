import { useEffect, useState, useRef } from 'react';
import { useGameStore } from './stores/useGameStore';
import { Timer } from './components/Timer';
import { LivesDisplay } from './components/LivesDisplay';
import { ItemShopGrid } from './components/ItemShopGrid';
import { ComponentTree } from './components/ComponentTree';
import { GameOverScreen } from './components/GameOverScreen';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
  const { gameStatus, startGame, timerActive, decrementTimer, handleTimerExpire, livesRemaining, currentLevel, levelComplete, proceedToNextLevel, timeRemaining } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showLifeLossFlash, setShowLifeLossFlash] = useState(false);
  const prevLivesRef = useRef(livesRemaining);

  // Detect life loss and trigger flash effect
  useEffect(() => {
    if (livesRemaining < prevLivesRef.current && gameStatus === 'playing') {
      setShowLifeLossFlash(true);
      const timer = setTimeout(() => setShowLifeLossFlash(false), 500);
      return () => clearTimeout(timer);
    }
    prevLivesRef.current = livesRemaining;
  }, [livesRemaining, gameStatus]);

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

  // Handle game start with loading state
  const handleStartGame = async () => {
    setIsLoading(true);
    await startGame();
    setIsLoading(false);
  };

  // Menu Screen - Centered on full viewport
  if (gameStatus === 'menu') {
    return (
      <div className="hextech-bg min-h-screen w-screen flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          {/* Logo/Title */}
          <div className="mb-12 animate-fade-in-up">
            <h1 className="font-display text-7xl md:text-8xl text-gold-gradient mb-4 tracking-wider">
              BUILDLE
            </h1>
            <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-hextech-gold to-transparent opacity-60"></div>
          </div>

          {/* Description */}
          <p className="font-ui text-xl md:text-2xl text-hextech-gold-light/80 mb-12 leading-relaxed animate-fade-in-up stagger-1 opacity-0">
            Test your knowledge of League of Legends item builds.
            <br />
            <span className="text-hextech-blue">Assemble items from memory before time runs out.</span>
          </p>

          {/* Start Button or Loading */}
          <div className="animate-fade-in-up stagger-2 opacity-0">
            {isLoading ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-hextech-gold/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-hextech-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="font-display text-xl text-hextech-gold tracking-widest">
                  LOADING...
                </p>
              </div>
            ) : (
              <button
                onClick={handleStartGame}
                className="btn-hextech text-xl px-12 py-4"
              >
                START GAME
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-16 animate-fade-in-up stagger-3 opacity-0">
            <div className="hextech-panel p-6 inline-block">
              <h3 className="font-display text-sm text-hextech-gold mb-4 tracking-wider">HOW TO PLAY</h3>
              <div className="space-y-3 text-left font-ui text-hextech-gold-light/70">
                <p className="flex items-center gap-3">
                  <span className="text-hextech-blue">▸</span>
                  Click components to reveal what you need to build
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-hextech-blue">▸</span>
                  Select the correct items from the shop grid
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-hextech-blue">▸</span>
                  Complete all components before time runs out
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing Screen - Centered layout
  if (gameStatus === 'playing') {
    return (
      <div className="hextech-bg min-h-screen w-screen flex flex-col items-center relative">
        {/* Life Loss Flash Overlay */}
        <AnimatePresence>
          {showLifeLossFlash && (
            <motion.div
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 bg-error-red/30 pointer-events-none z-50"
            />
          )}
        </AnimatePresence>

        {/* Level Complete Overlay */}
        <AnimatePresence>
          {levelComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="hextech-panel p-8 text-center"
              >
                <h2 className={`font-display text-3xl mb-2 ${timeRemaining > 0 ? 'text-success-green' : 'text-hextech-gold'}`}>
                  {timeRemaining > 0 ? 'LEVEL COMPLETE!' : "TIME'S UP!"}
                </h2>
                <p className="font-ui text-hextech-gold-light/70 mb-6">
                  {timeRemaining > 0
                    ? `Level ${currentLevel} cleared with ${timeRemaining}s remaining`
                    : `Level ${currentLevel} complete`
                  }
                </p>
                <button
                  onClick={proceedToNextLevel}
                  className="btn-hextech text-lg px-8 py-3"
                >
                  NEXT LEVEL
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Bar - Full width header */}
        <header className="relative z-10 shrink-0 w-full">
          <div className="hextech-panel border-t-0 rounded-t-none">
            <div className="container mx-auto px-4 py-1.5">
              <div className="flex items-center justify-between">
                {/* Left: Lives */}
                <div className="flex items-center gap-3 w-28">
                  <LivesDisplay />
                </div>

                {/* Center: Timer */}
                <div className="flex justify-center">
                  <Timer />
                </div>

                {/* Right: Level */}
                <div className="text-right w-28">
                  <p className="font-ui text-[10px] text-hextech-gold-light/60 uppercase tracking-wider">Level</p>
                  <p className="font-display text-2xl text-gold-gradient">
                    {currentLevel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Game Area - Full width with minimal margins */}
        <main className="flex-1 w-full flex justify-center items-stretch px-6 py-4 overflow-hidden">
          <div className="flex gap-6 w-full max-w-[1800px]">
            {/* Left Panel: Component Tree (Build Path) */}
            <section className="flex-1 h-full">
              <div className="hextech-panel p-5 h-full flex flex-col">
                <h2 className="font-display text-base text-hextech-gold mb-4 tracking-wider flex items-center justify-center gap-2">
                  <span className="w-5 h-px bg-gradient-to-r from-hextech-gold to-transparent"></span>
                  BUILD PATH
                  <span className="w-5 h-px bg-gradient-to-l from-hextech-gold to-transparent"></span>
                </h2>
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <ComponentTree />
                </div>
              </div>
            </section>

            {/* Right Panel: Item Shop */}
            <section className="flex-1 h-full">
              <div className="hextech-panel p-5 h-full flex flex-col">
                <h2 className="font-display text-base text-hextech-gold mb-4 tracking-wider flex items-center justify-center gap-2">
                  <span className="w-5 h-px bg-gradient-to-r from-hextech-gold to-transparent"></span>
                  ITEM SHOP
                  <span className="w-5 h-px bg-gradient-to-l from-hextech-gold to-transparent"></span>
                </h2>
                <div className="flex-1 overflow-hidden">
                  <ItemShopGrid />
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // Game Over Screen
  return <GameOverScreen />;
}

export default App;
