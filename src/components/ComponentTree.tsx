/**
 * ComponentTree Component
 *
 * Displays the nested component tree for the target item the player needs to build.
 * Features authentic LoL build path visualization with SVG connector lines.
 *
 * COLUMN-BASED LAYOUT: Each Row 2 component has its own vertical column
 * showing its sub-components directly beneath it for full tree visualization.
 */

import { useGameStore } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { formatGold } from '../utils/formatting';
import { motion } from 'framer-motion';


/**
 * ComponentTree Component
 */
export function ComponentTree() {
  const {
    targetItem,
    focusedComponentPath,
    unlockedComponents,
    failedComponents,
    requiresFinalGold,
    dataVersion,
    focusComponent,
  } = useGameStore();

  if (!targetItem || !dataVersion) {
    return null;
  }

  const isUnlocked = (path: number[]): boolean => {
    return unlockedComponents.has(path.join(','));
  };

  const isFailed = (path: number[]): boolean => {
    return failedComponents.has(path.join(','));
  };

  const isFocused = (path: number[]): boolean => {
    return path.join(',') === focusedComponentPath.join(',');
  };

  // Only Row 2 components are clickable
  const handleRow2Click = (index: number) => {
    const path = [index];
    if (!isUnlocked(path)) {
      focusComponent(path);
    }
  };

  const numChildren = targetItem.children.length;

  // Calculate total combine cost for Row 2 (gold needed after all Row 2 components)
  const row2CombineCost = targetItem.goldCost;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
      {/* Row 1: Target Item - FIXED AT TOP */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative">
          <div className="item-slot p-2 relative z-10">
            <img
              src={getItemImageUrl(targetItem.itemId, dataVersion)}
              alt={targetItem.itemName}
              className="w-20 h-20"
            />
          </div>
          <div className="absolute inset-0 bg-hextech-gold/20 blur-lg rounded-full scale-150 -z-10"></div>
        </div>
        <h2 className="font-display text-xl text-hextech-gold mt-2 tracking-wide">
          {targetItem.itemName}
        </h2>
        {/* Show combine cost and/or total cost below item name */}
        <div className="flex items-center gap-3 mt-1">
          {row2CombineCost > 0 && (
            <span className="font-ui text-sm text-yellow-400 font-semibold">
              +{formatGold(row2CombineCost)}
            </span>
          )}
          {requiresFinalGold && (
            <span className="font-ui text-yellow-500/70 text-sm">
              (Total: {formatGold(targetItem.totalCost)})
            </span>
          )}
        </div>
      </div>

      {/* SVG Connector from Row 1 to all Row 2 columns - 90 degree angular lines */}
      <div className="w-full flex justify-center mb-2">
        {(() => {
          // Calculate total width based on columns (no gold column now)
          const columnWidth = 220; // Larger width per column
          const totalWidth = numChildren * columnWidth;
          const centerX = totalWidth / 2;
          const midY = 25; // Horizontal line Y position

          return (
            <svg
              width={totalWidth}
              height="50"
              viewBox={`0 0 ${totalWidth} 50`}
              className="overflow-visible"
            >
              {/* Vertical line from top center down to mid */}
              <line x1={centerX} y1="0" x2={centerX} y2={midY} stroke="#C8AA6E" strokeWidth={2} />

              {/* Lines to each Row 2 component */}
              {targetItem.children.map((_, index) => {
                const columnCenterX = index * columnWidth + columnWidth / 2;
                const isChildUnlocked = isUnlocked([index]);
                const isChildFailed = isFailed([index]);
                const isChildFocused = isFocused([index]);

                const strokeCol = isChildUnlocked
                  ? (isChildFailed ? '#EF4444' : '#0BDA51')
                  : isChildFocused
                    ? '#0AC8B9'
                    : '#785A28';
                const opac = isChildUnlocked ? 1 : isChildFocused ? 1 : 0.6;

                return (
                  <g key={index}>
                    {/* Horizontal line from center to column */}
                    <line
                      x1={centerX}
                      y1={midY}
                      x2={columnCenterX}
                      y2={midY}
                      stroke={strokeCol}
                      strokeWidth={2}
                      opacity={opac}
                    />
                    {/* Vertical line down to component */}
                    <line
                      x1={columnCenterX}
                      y1={midY}
                      x2={columnCenterX}
                      y2="50"
                      stroke={strokeCol}
                      strokeWidth={2}
                      opacity={opac}
                    />
                  </g>
                );
              })}
            </svg>
          );
        })()}
      </div>

      {/* Row 2 + Row 3: Column-based layout */}
      <div className="flex justify-center items-start gap-6">
        {targetItem.children.map((child, index) => {
          const unlocked = isUnlocked([index]);
          const failed = isFailed([index]);
          const focused = isFocused([index]);
          const hasSubChildren = child.children.length > 0;

          const strokeColor = unlocked
            ? (failed ? '#EF4444' : '#0BDA51')
            : focused
              ? '#0AC8B9'
              : '#C8AA6E';

          return (
            <div key={index} className="flex flex-col items-center" style={{ minWidth: '200px' }}>

              {/* Row 2: Component Slot */}
              <button
                onClick={() => handleRow2Click(index)}
                disabled={unlocked}
                className={`
                  item-slot relative flex flex-col items-center justify-center p-2 w-24 h-28
                  transition-all duration-200
                  ${unlocked ? (failed ? 'border-error-red' : 'unlocked') : focused ? 'focused' : 'locked'}
                  ${!unlocked && !focused ? 'hover:scale-105 cursor-pointer' : ''}
                `}
              >
                {unlocked ? (
                  <motion.div
                    initial={{ scale: 0.8, rotate: 5 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center"
                  >
                    <img
                      src={getItemImageUrl(child.itemId, dataVersion)}
                      alt={child.itemName}
                      className="w-14 h-14"
                    />
                    {failed ? (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-error-red rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">✗</span>
                      </div>
                    ) : (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-success-green rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                    <p className="font-ui text-[10px] text-hextech-gold-light/80 mt-1 text-center leading-tight line-clamp-2 max-w-20">
                      {child.itemName}
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-lol-dark border-2 border-lol-border rounded flex items-center justify-center">
                      <span className="font-display text-2xl text-lol-muted">?</span>
                    </div>
                    <p className="font-ui text-xs text-lol-muted mt-1">
                      {focused ? 'Building...' : 'Click'}
                    </p>
                  </div>
                )}
              </button>

              {/* Only show Row 3 section if this component has sub-children */}
              {hasSubChildren && (
                <>
                  {/* Connector lines from Row 2 to Row 3 - 90 degree angular lines */}
                  <div className="h-12 flex items-center justify-center w-full">
                    {(() => {
                      const numSubs = child.children.length;
                      // Match actual slot dimensions: w-16 = 64px, gap-2 = 8px
                      const subSlotWidth = 64;
                      const gap = 8;
                      const totalWidth = numSubs * subSlotWidth + (numSubs - 1) * gap;
                      const centerX = totalWidth / 2;
                      const midY = 24; // Horizontal line Y position
                      const strokeCol = focused ? '#0AC8B9' : unlocked ? (failed ? '#EF4444' : '#0BDA51') : '#785A28';
                      const opac = focused || unlocked ? 1 : 0.4;

                      return (
                        <svg
                          width={totalWidth}
                          height="48"
                          viewBox={`0 0 ${totalWidth} 48`}
                          className="overflow-visible"
                        >
                          {/* Vertical line from top center down to mid */}
                          <line x1={centerX} y1="0" x2={centerX} y2={midY} stroke={strokeCol} strokeWidth={2} opacity={opac} />

                          {/* Lines to each sub-component slot */}
                          {Array.from({ length: numSubs }).map((_, subIdx) => {
                            const slotCenterX = subIdx * (subSlotWidth + gap) + subSlotWidth / 2;
                            return (
                              <g key={subIdx}>
                                {/* Horizontal line from center to slot */}
                                <line
                                  x1={centerX}
                                  y1={midY}
                                  x2={slotCenterX}
                                  y2={midY}
                                  stroke={strokeCol}
                                  strokeWidth={2}
                                  opacity={opac}
                                />
                                {/* Vertical line down to slot */}
                                <line
                                  x1={slotCenterX}
                                  y1={midY}
                                  x2={slotCenterX}
                                  y2="48"
                                  stroke={strokeCol}
                                  strokeWidth={2}
                                  opacity={opac}
                                />
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* Row 3: Sub-components (within column) */}
                  <div className="flex flex-col items-center">
                    <div className="flex justify-center items-start gap-2">
                      {child.children.map((subChild, subIndex) => (
                        <motion.div
                          key={subIndex}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: subIndex * 0.03 }}
                          className={`
                            item-slot relative flex flex-col items-center justify-center p-2 w-16 h-20 cursor-default
                            ${focused ? 'border-hextech-blue/50' : ''}
                            ${unlocked ? 'border-success-green/50' : ''}
                          `}
                        >
                          {unlocked ? (
                            // Show actual item when parent is unlocked
                            <>
                              <img
                                src={getItemImageUrl(subChild.itemId, dataVersion)}
                                alt={subChild.itemName}
                                className="w-11 h-11"
                              />
                              <p className="font-ui text-[9px] text-hextech-gold-light/70 mt-1 text-center leading-tight line-clamp-1">
                                {subChild.itemName}
                              </p>
                            </>
                          ) : (
                            // Show placeholder when parent is locked
                            <>
                              <div className="w-11 h-11 bg-lol-dark border-2 border-lol-border rounded flex items-center justify-center">
                                <span className="font-display text-lg text-lol-muted">?</span>
                              </div>
                              <p className="font-ui text-[10px] text-lol-muted mt-1 text-center">
                                {focused ? 'Need' : ''}
                              </p>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    {/* Gold cost as simple text below sub-components */}
                    {child.goldCost > 0 && (
                      <p className="font-ui text-xs text-yellow-400 font-semibold mt-2">
                        +{formatGold(child.goldCost)}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
