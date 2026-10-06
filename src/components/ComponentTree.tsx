/**
 * ComponentTree Component
 *
 * Displays the nested component tree for the target item the player needs to build.
 * Features authentic LoL build path visualization with SVG connector lines.
 *
 * COLUMN-BASED LAYOUT: Each Row 2 component has its own column showing its
 * sub-components directly beneath it. Columns and connectors scale with the
 * container, so the tree fits any screen width.
 */

import { useGameStore, getComponentStats } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { motion } from 'framer-motion';
import { tooltipProps } from '../utils/tooltip';
import { SlotBurst } from './SlotBurst';
import { Gold } from './Gold';
import { parseItemDescription } from '../utils/itemText';

const LINE_COLORS = {
  idle: '#785A28',
  focused: '#0AC8B9',
  done: '#0BDA51',
  failed: '#E84057',
  gold: '#C8901C',
};

/** Max width of one Row 2 column, so short recipes don't stretch across the whole panel */
const ROW2_COLUMN_REM = 10;

/**
 * Right-angled connector from one parent (top center) to `colors.length` evenly
 * spaced children, so the tree is always symmetric under its parent.
 * Drawn in a 0-100 coordinate space so it stretches with its container.
 * Dashed branches lead to the combine-gold piece.
 */
function Connector({ colors, dashed = [], height = 28, parentColor = LINE_COLORS.idle }: {
  colors: string[];
  dashed?: boolean[];
  height?: number;
  parentColor?: string;
}) {
  const mid = height / 2;
  const centers = colors.map((_, i) => ((i + 0.5) * 100) / colors.length);

  return (
    <svg
      className="w-full block"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="50" y1="0" x2="50" y2={mid} stroke={parentColor} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {colors.map((color, i) => {
        const x = centers[i];
        return (
          <g key={i} stroke={color} strokeWidth={2} strokeDasharray={dashed[i] ? '4 3' : undefined}>
            <line x1="50" y1={mid} x2={x} y2={mid} vectorEffect="non-scaling-stroke" />
            <line x1={x} y1={mid} x2={x} y2={height} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

/** The combine cost as its own piece of the recipe, next to the components */
function GoldPiece({ amount, small = false }: { amount: number; small?: boolean }) {
  return (
    <div
      className={`gold-piece flex flex-col items-center justify-center text-center ${
        small ? 'w-full max-w-14 aspect-square p-0.5' : 'w-[3.75rem] sm:w-20 h-20 sm:h-24 p-1'
      }`}
      title={`Combine cost: ${amount} gold on top of the components`}
    >
      <span className={small ? 'text-sm' : 'text-2xl'}><Gold amount={amount} prefix="+" className="flex-col !gap-0.5" /></span>
      {!small && <span className="font-ui text-[0.7rem] text-[#F5C842]/70 uppercase tracking-wide mt-0.5">combine</span>}
    </div>
  );
}

/**
 * League-style stat card for the target item, shown beside its icon.
 * Lives in the right column of a [1fr | item | 1fr] grid, so the icon stays centered.
 */
function TargetStats({ itemId }: { itemId: string }) {
  const item = useGameStore(s => s.allItems?.[itemId]);
  if (!item) return null;
  const { stats, effects } = parseItemDescription(item.description);
  if (stats.length === 0 && effects.length === 0) return null;

  return (
    <div className="hidden sm:block justify-self-start self-start mt-1 w-full max-w-60 min-w-0 text-left">
      <div className="target-stats rounded-md px-3 py-2.5">
        <ul className="space-y-0.5">
          {stats.map(stat => (
            <li key={stat} className="font-ui text-sm font-bold text-hextech-blue leading-tight">{stat}</li>
          ))}
        </ul>
        {effects.slice(0, 2).map(effect => (
          <p key={effect.name} className="hide-when-very-short font-ui text-xs text-hextech-gold-light/75 leading-snug mt-1.5 line-clamp-2">
            <span className="font-bold text-hextech-gold">{effect.name}</span>
            {effect.text && ` · ${effect.text}`}
          </p>
        ))}
        {effects.length > 2 && <p className="hide-when-very-short font-ui text-[0.7rem] text-hextech-gold-light/55 mt-1">+{effects.length - 2} more · hover the item</p>}
      </div>
    </div>
  );
}

/** Compact stat chips under the target name on phones */
function TargetStatChips({ itemId }: { itemId: string }) {
  const item = useGameStore(s => s.allItems?.[itemId]);
  if (!item) return null;
  const { stats } = parseItemDescription(item.description);
  if (stats.length === 0) return null;

  return (
    <div className="sm:hidden flex flex-wrap justify-center gap-1 mt-1 px-2">
      {stats.map(stat => (
        <span key={stat} className="font-ui text-[0.7rem] font-bold text-hextech-blue bg-hextech-blue/10 border border-hextech-blue/30 rounded px-1.5">
          {stat}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ failed, small = false }: { failed: boolean; small?: boolean }) {
  const size = small ? 'w-4 h-4 text-[0.7rem]' : 'w-5 h-5 text-xs';
  return (
    <div className={`absolute -top-1.5 -right-1.5 ${size} ${failed ? 'bg-error-red' : 'bg-success-green'} rounded-full flex items-center justify-center shadow-lg z-10`}>
      <span className="text-white font-bold leading-none">{failed ? '✗' : '✓'}</span>
    </div>
  );
}

/** On phones the shop sits below the tree: bring it into view after picking a slot */
function scrollToShopOnPhones(): void {
  if (window.innerWidth < 1024) {
    document.getElementById('item-shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * ComponentTree Component
 */
export function ComponentTree() {
  const {
    targetItem,
    focusedComponentPath,
    unlockedComponents,
    failedComponents,
    hintsShown,
    revealedComponents,
    allItems,
    isBuyAllMode,
    settings,
    mode,
    dataVersion,
    levelComplete,
    selectedItems,
    focusComponent,
    toggleBuyAll,
  } = useGameStore();

  if (!targetItem || !dataVersion || !allItems) {
    return null;
  }

  const isUnlocked = (index: number) => unlockedComponents.has(String(index));
  const isFailed = (index: number) => failedComponents.has(String(index));
  const isFocused = (index: number) => !isBuyAllMode && focusedComponentPath[0] === index;

  const lineColor = (index: number) =>
    isUnlocked(index)
      ? (isFailed(index) ? LINE_COLORS.failed : LINE_COLORS.done)
      : isFocused(index) || isBuyAllMode ? LINE_COLORS.focused : LINE_COLORS.idle;

  const numChildren = targetItem.children.length;
  const hasGold = targetItem.goldCost > 0;
  // The combine gold is a full column, so the row stays symmetric under the target
  const row2Columns = numChildren + (hasGold ? 1 : 0);
  const canBuyAll = unlockedComponents.size === 0 && !levelComplete;
  // Total cost is part of the quiz from level 10 on, so hide it there
  const showTotalCost = mode === 'practice' || !settings.finalGoldCheck || levelComplete;

  return (
    <div className="w-full mx-auto flex flex-col items-center">
      {/* Row 1: Target Item (clickable for "Buy All" mode), with its stats card on the right */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-4 w-full">
      <div aria-hidden="true" />
      <div className="flex flex-col items-center">
        <button
          onClick={() => { toggleBuyAll(); scrollToShopOnPhones(); }}
          disabled={!canBuyAll && !isBuyAllMode}
          className="relative group disabled:cursor-default"
          title={isBuyAllMode ? 'Cancel Buy All (Esc)' : canBuyAll ? 'Buy every base component at once for ×1.5 points (B)' : targetItem.itemName}
        >
          {/* Bonus badge: Buy All is worth more */}
          {(canBuyAll || isBuyAllMode) && (
            <span className={`absolute -top-2 -right-3 z-20 px-1.5 py-0.5 rounded-full font-ui text-xs font-bold shadow-lg border ${
              isBuyAllMode ? 'bg-hextech-blue text-lol-black border-hextech-blue' : 'bg-lol-dark text-hextech-blue border-hextech-blue/60 group-hover:bg-hextech-blue group-hover:text-lol-black'
            } transition-colors`}>
              ×1.5
            </span>
          )}
          <div className={`
            item-slot p-1.5 relative z-10 transition-colors duration-200
            ${isBuyAllMode ? '!border-hextech-blue shadow-hextech' : ''}
          `}>
            <img
              {...tooltipProps(targetItem.itemId)}
              src={getItemImageUrl(targetItem.itemId, dataVersion)}
              alt={targetItem.itemName}
              className="w-16 h-16 sm:w-20 sm:h-20"
            />
          </div>
          <div className={`
            absolute inset-0 blur-lg rounded-full scale-150 -z-10 transition-colors
            ${isBuyAllMode ? 'bg-hextech-blue/30' : 'bg-hextech-gold/20 group-hover:bg-hextech-gold/30'}
          `}></div>
        </button>
        <h2 className="font-display text-lg sm:text-xl text-hextech-gold mt-2 tracking-wide text-center">
          {targetItem.itemName}
        </h2>
        <TargetStatChips itemId={targetItem.itemId} />
        <div className="flex items-center gap-3 mt-0.5 h-5">
          {showTotalCost && (
            <span className="font-ui text-yellow-500/70 text-sm">
              Total <Gold amount={targetItem.totalCost} />
            </span>
          )}
        </div>
      </div>
      <TargetStats itemId={targetItem.itemId} />
      </div>

      {/* Buy All prompt, full width under the target so it doesn't squeeze the stats card */}
      <div className="flex justify-center">
      {/* Fixed height to prevent layout shift */}
      <div className="min-h-7 flex items-center">
        {isBuyAllMode ? (
          <div className="flex items-center gap-2">
            <span className="font-ui text-sm font-bold text-hextech-blue tracking-wide">⚡ BUY ALL · ×1.5 points</span>
            <button
              onClick={toggleBuyAll}
              className="font-ui text-xs font-bold px-2 py-0.5 rounded border border-hextech-gold-light/40 text-hextech-gold-light hover:border-error-red hover:text-error-red transition-colors"
            >
              ✕ Cancel <kbd className="kbd hidden sm:inline-block">Esc</kbd>
            </button>
          </div>
        ) : canBuyAll ? (
          <button onClick={() => { toggleBuyAll(); scrollToShopOnPhones(); }} className="font-ui text-sm text-hextech-gold-light/70 hover:text-hextech-blue transition-colors">
            Know the full recipe? <span className="font-bold text-hextech-blue">Buy it all for ×1.5 points</span> <kbd className="kbd hidden sm:inline-block">B</kbd>
          </button>
        ) : null}
      </div>
      </div>

      {/* Connector from Row 1 to all Row 2 columns */}
      <div className="w-full mx-auto" style={{ maxWidth: `${row2Columns * ROW2_COLUMN_REM}rem` }}>
        <Connector
          colors={[...targetItem.children.map((_, i) => lineColor(i)), ...(hasGold ? [LINE_COLORS.gold] : [])]}
          dashed={[...targetItem.children.map(() => false), hasGold]}
          parentColor={isBuyAllMode ? LINE_COLORS.focused : '#C8AA6E'}
        />
      </div>

      {/* Row 2 + Row 3: Column-based layout (+ the combine gold as its own piece) */}
      <div
        className="grid w-full mx-auto"
        style={{ gridTemplateColumns: `repeat(${row2Columns}, minmax(0, 1fr))`, maxWidth: `${row2Columns * ROW2_COLUMN_REM}rem` }}
      >
        {targetItem.children.map((child, index) => {
          const unlocked = isUnlocked(index);
          const failed = isFailed(index);
          const focused = isFocused(index);
          const hasSubChildren = child.children.length > 0;
          const peeked = revealedComponents.has(index);
          const hints = getComponentStats(allItems, child.itemId).slice(0, hintsShown.get(index) ?? 0);
          const subGold = child.goldCost > 0;
          const subColumns = child.children.length + (subGold ? 1 : 0);
          const subWidth = subColumns * 4;

          return (
            <div
              key={index}
              className={`flex flex-col items-center min-w-0 px-0.5 pb-1.5 rounded-lg transition-colors ${
                focused && !unlocked ? 'focus-column' : ''
              }`}
            >
              {/* Row 2: Component Slot */}
              <button
                onClick={() => {
                  focusComponent([index]);
                  scrollToShopOnPhones();
                }}
                disabled={unlocked || levelComplete}
                className={`
                  item-slot relative flex flex-col items-center justify-center p-1.5 w-[4.5rem] sm:w-24 h-24 sm:h-28
                  transition-all duration-200
                  ${unlocked ? (failed ? '!border-error-red' : 'unlocked') : focused ? 'focused' : isBuyAllMode ? '!border-hextech-blue/60' : 'locked cursor-pointer'}
                `}
              >
                {unlocked ? (
                  <motion.div
                    initial={{ scale: 0.6, rotate: 8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="flex flex-col items-center"
                  >
                    <img
                      {...tooltipProps(child.itemId)}
                      src={getItemImageUrl(child.itemId, dataVersion)}
                      alt={child.itemName}
                      className="w-12 h-12 sm:w-14 sm:h-14"
                    />
                    <StatusBadge failed={failed} />
                    {!failed && <SlotBurst />}
                    <p className="font-ui text-[0.75rem] text-hextech-gold-light/80 mt-1 text-center leading-tight line-clamp-2">
                      {child.itemName}
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center">
                    {peeked ? (
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14">
                        <img
                          {...tooltipProps(child.itemId)}
                          src={getItemImageUrl(child.itemId, dataVersion)}
                          alt={child.itemName}
                          className="w-full h-full rounded opacity-70"
                        />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-lol-dark border border-hextech-blue flex items-center justify-center text-[0.75rem]" title="Revealed by Peek">
                          👁
                        </span>
                      </div>
                    ) : focused && !hasSubChildren && selectedItems[0] ? (
                      <img
                        src={getItemImageUrl(selectedItems[0], dataVersion)}
                        alt={allItems[selectedItems[0]]?.name ?? ''}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded border-2 border-hextech-blue"
                      />
                    ) : (
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-lol-dark border-2 rounded flex items-center justify-center ${focused ? 'border-hextech-gold/60' : 'border-lol-border'}`}>
                        <span className={`font-display text-2xl ${focused ? 'text-hextech-gold' : 'text-lol-muted'}`}>?</span>
                      </div>
                    )}
                    <p className={`font-ui text-[0.75rem] sm:text-xs mt-1 ${focused ? 'text-hextech-gold' : 'text-lol-muted'}`}>
                      {focused
                        ? (hasSubChildren ? 'Pick its parts ↓' : 'Buy it →')
                        : child.children.length === 0 ? 'Basic' : `${child.children.length} part${child.children.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                )}
              </button>

              {/* Stat hints revealed for this hidden component */}
              {!unlocked && hints.length > 0 && (
                <div className="mt-1 flex flex-col items-center gap-0.5 max-w-full">
                  {hints.map(line => (
                    <span key={line} className="font-ui text-[0.7rem] sm:text-[0.75rem] leading-tight text-hextech-blue bg-hextech-blue/10 border border-hextech-blue/30 rounded px-1 py-px text-center break-words max-w-full">
                      💡 {line}
                    </span>
                  ))}
                </div>
              )}

              {/* Row 3: Sub-components (hidden until the slot is bought) */}
              {hasSubChildren && (
                <div className="w-full flex flex-col items-center">
                  <div className="w-full" style={{ maxWidth: `${subWidth}rem` }}>
                    <Connector
                      colors={[...child.children.map(() => lineColor(index)), ...(subGold ? [LINE_COLORS.gold] : [])]}
                      dashed={[...child.children.map(() => false), subGold]}
                      parentColor={lineColor(index)}
                      height={24}
                    />
                  </div>
                  <div
                    className="grid w-full"
                    style={{
                      gridTemplateColumns: `repeat(${subColumns}, minmax(0, 1fr))`,
                      maxWidth: `${subWidth}rem`,
                    }}
                  >
                    {child.children.map((subChild, subIndex) => {
                      const showItem = unlocked;
                      // While building this component, its parts fill with your shop picks
                      const picked = focused && !unlocked ? selectedItems[subIndex] : undefined;
                      const isPartSlot = focused && !unlocked;

                      return (
                        <div key={subIndex} className="flex flex-col items-center min-w-0 px-0.5">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: subIndex * 0.03 }}
                            title={showItem ? subChild.itemName : undefined}
                            className={`
                              item-slot relative flex items-center justify-center p-1 w-full max-w-14 aspect-square cursor-default
                              ${isPartSlot ? (picked ? '!border-hextech-blue' : '!border-hextech-blue/70 part-slot-empty') : ''}
                              ${unlocked ? (failed ? '!border-error-red/50' : '!border-success-green/50') : ''}
                            `}
                          >
                            {showItem ? (
                              <img
                                {...tooltipProps(subChild.itemId)}
                                src={getItemImageUrl(subChild.itemId, dataVersion)}
                                alt={subChild.itemName}
                                className="w-full h-full"
                              />
                            ) : picked ? (
                              <img
                                {...tooltipProps(picked)}
                                src={getItemImageUrl(picked, dataVersion)}
                                alt={allItems[picked]?.name ?? ''}
                                className="w-full h-full"
                              />
                            ) : (
                              <span className={`font-display text-base ${isPartSlot ? 'text-hextech-blue' : 'text-lol-muted'}`}>{isPartSlot ? '+' : '?'}</span>
                            )}
                            {unlocked && <StatusBadge failed={failed} small />}
                          </motion.div>
                          <p className={`hidden sm:block font-ui text-[0.7rem] mt-0.5 text-center leading-tight line-clamp-1 w-full text-hextech-gold-light/70`}>
                            {showItem ? subChild.itemName : picked ? allItems[picked]?.name ?? '' : ''}
                          </p>
                        </div>
                      );
                    })}
                    {subGold && (
                      <div className="flex flex-col items-center justify-start min-w-0 px-0.5">
                        <GoldPiece amount={child.goldCost} small />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {hasGold && (
          <div className="flex flex-col items-center min-w-0 px-0.5 pt-2">
            <GoldPiece amount={targetItem.goldCost} />
          </div>
        )}
      </div>
    </div>
  );
}
