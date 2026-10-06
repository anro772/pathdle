import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from './stores/useGameStore';
import {
  ComponentTree,
  FeedbackToast,
  GameHeader,
  GameOverScreen,
  GoldCheckModal,
  ItemShopGrid,
  LevelCompleteCard,
  MenuScreen,
} from './components';
import { useHotkeys } from './hooks/useHotkeys';
import { getChampionSplashUrl } from './services/RiotService';
import { hasChampionQuiz } from './utils/championQuiz';
import { hideTooltip } from './utils/tooltip';
import { ItemTooltipLayer } from './components/ItemTooltip';
import { AchievementToast } from './components/AchievementToast';
import { useGameEffects } from './hooks/useGameEffects';
import './App.css';

function Panel({ id, title, backdrop, children }: { id?: string; title: string; backdrop?: string | null; children: React.ReactNode }) {
  return (
    <section id={id} className="flex-1 min-w-0 scroll-mt-2">
      {/* overflow-hidden only where a backdrop is drawn: it would break the shop's sticky cart */}
      <div className={`hextech-panel p-3 sm:p-4 h-full flex flex-col ${backdrop !== undefined ? 'overflow-hidden' : ''}`}>
        {/* Splash art of the champion who builds this item most */}
        <AnimatePresence>
          {backdrop && (
            <motion.img
              key={backdrop}
              src={backdrop}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 0.22, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              onError={e => (e.currentTarget.style.display = 'none')}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none splash-fade"
            />
          )}
        </AnimatePresence>
        <h2 className="hide-when-short relative font-display text-sm sm:text-base text-hextech-gold mb-2 tracking-wider flex items-center justify-center gap-2">
          <span className="w-5 h-px bg-gradient-to-r from-hextech-gold to-transparent"></span>
          {title}
          <span className="w-5 h-px bg-gradient-to-l from-hextech-gold to-transparent"></span>
        </h2>
        <div className="relative flex-1 flex flex-col justify-center">{children}</div>
      </div>
    </section>
  );
}

function GameScreen() {
  const { levelComplete, goldCheckState, currentLevel, targetItem, meta, mode, bonusClaimed } = useGameStore();
  // Reveal the top builder's splash once the level is over (after the bonus question, so it isn't a spoiler)
  const topChampion = targetItem ? meta?.items[targetItem.itemId]?.topChamps[0]?.name : undefined;
  const showSplash = levelComplete && !!targetItem &&
    (bonusClaimed || !hasChampionQuiz(meta, targetItem.itemId, mode === 'practice'));
  const [showLifeLossFlash, setShowLifeLossFlash] = useState(false);

  // Detect life loss and trigger flash effect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.livesRemaining < prev.livesRemaining) {
        setShowLifeLossFlash(true);
        clearTimeout(timer);
        timer = setTimeout(() => setShowLifeLossFlash(false), 500);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="hextech-bg min-h-screen w-full flex flex-col items-center relative">
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

      <AnimatePresence>{levelComplete && <LevelCompleteCard />}</AnimatePresence>
      <AnimatePresence>{goldCheckState.isActive && <GoldCheckModal />}</AnimatePresence>
      <FeedbackToast />

      <GameHeader />

      {/* Main Game Area */}
      <main className="game-main relative flex-1 w-full flex justify-center px-2 sm:px-6 py-2 sm:py-3">
        <motion.div
          key={currentLevel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col lg:flex-row gap-3 sm:gap-6 w-full max-w-[1500px]"
        >
          <Panel title="BUILD PATH" backdrop={showSplash && topChampion ? getChampionSplashUrl(topChampion) : null}>
            <ComponentTree />
          </Panel>
          <Panel id="item-shop" title="ITEM SHOP">
            <ItemShopGrid />
          </Panel>
        </motion.div>
      </main>
    </div>
  );
}

function App() {
  const gameStatus = useGameStore(s => s.gameStatus);

  useHotkeys();
  useGameEffects();

  // Items under an open tooltip can disappear between levels/screens
  useEffect(() => {
    return useGameStore.subscribe((state, prev) => {
      if (state.targetItem !== prev.targetItem || state.levelComplete !== prev.levelComplete || state.gameStatus !== prev.gameStatus) {
        hideTooltip();
      }
    });
  }, []);

  return (
    <>
      {gameStatus === 'playing' ? <GameScreen /> : gameStatus === 'gameover' ? <GameOverScreen /> : <MenuScreen />}
      <ItemTooltipLayer />
      <AchievementToast />
    </>
  );
}

export default App;
