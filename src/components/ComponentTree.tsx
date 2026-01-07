/**
 * ComponentTree Component
 *
 * Displays the nested component tree for the target item the player needs to build.
 * Shows Row 1 (target item), Row 2 (direct components), and Row 3 (sub-components when focused).
 */

import { useGameStore } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { formatGold } from '../utils/formatting';

/**
 * ComponentTree Component
 *
 * Visual representation of the item build path with three rows:
 * - Row 1: Target item (always visible)
 * - Row 2: Component slots (locked/focused/unlocked states)
 * - Row 3: Sub-component slots (shown when Row 2 slot is focused and has children)
 */
export function ComponentTree() {
  const {
    targetItem,
    focusedComponentPath,
    unlockedComponents,
    requiresComponentGold,
    requiresFinalGold,
    dataVersion,
    focusComponent,
  } = useGameStore();

  // Don't render if no target item
  if (!targetItem || !dataVersion) {
    return null;
  }

  // Helper: Check if a component path is unlocked
  const isUnlocked = (path: number[]): boolean => {
    return unlockedComponents.has(JSON.stringify(path));
  };

  // Helper: Check if a component path is focused
  const isFocused = (path: number[]): boolean => {
    return JSON.stringify(path) === JSON.stringify(focusedComponentPath);
  };

  // Helper: Handle slot click (only if locked)
  const handleSlotClick = (path: number[]) => {
    if (!isUnlocked(path)) {
      focusComponent(path);
    }
  };

  // Find focused Row 2 component for Row 3 display
  const focusedRow2Index = focusedComponentPath.length === 1 ? focusedComponentPath[0] : -1;
  const focusedRow2Component = focusedRow2Index >= 0 ? targetItem.children[focusedRow2Index] : null;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Row 1: Target Item (Always Visible) */}
      <div className="flex flex-col items-center gap-3 p-6 bg-slate-medium border-2 border-slate-light rounded-lg">
        <img
          src={getItemImageUrl(targetItem.itemId, dataVersion)}
          alt={targetItem.itemName}
          className="w-24 h-24"
        />
        <h2 className="text-2xl font-bold text-hextech-gold">{targetItem.itemName}</h2>
        {requiresFinalGold && (
          <p className="text-lg text-hextech-gold">
            Total Cost: {formatGold(targetItem.totalCost)}
          </p>
        )}
      </div>

      {/* Row 2: Component Slots */}
      <div className="grid grid-cols-3 gap-4">
        {targetItem.children.map((child, index) => {
          const path = [index];
          const unlocked = isUnlocked(path);
          const focused = isFocused(path);

          return (
            <button
              key={index}
              onClick={() => handleSlotClick(path)}
              disabled={unlocked}
              className={`
                relative flex flex-col items-center justify-center gap-2 p-6 rounded-lg
                border-2 transition-all
                ${unlocked
                  ? 'bg-slate-dark border-success-green cursor-default'
                  : focused
                    ? 'bg-slate-medium border-hextech-gold shadow-gold cursor-default'
                    : 'bg-slate-medium border-slate-light hover:border-hextech-gold cursor-pointer'
                }
              `}
            >
              {unlocked ? (
                <>
                  <img
                    src={getItemImageUrl(child.itemId, dataVersion)}
                    alt={child.itemName}
                    className="w-16 h-16"
                  />
                  <span className="absolute top-2 right-2 text-2xl text-success-green font-bold">
                    ✓
                  </span>
                  <p className="text-sm text-white text-center">{child.itemName}</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-slate-dark border-2 border-slate-light rounded flex items-center justify-center">
                    <span className="text-4xl text-slate-light">?</span>
                  </div>
                  <p className="text-sm text-slate-light">Click to build</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Row 3: Sub-components (Conditional) */}
      {focusedRow2Component && focusedRow2Component.children.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-hextech-gold text-center">
            Components needed for {focusedRow2Component.itemName}:
          </h3>

          <div className="grid grid-cols-3 gap-4">
            {focusedRow2Component.children.map((subChild, subIndex) => {
              const path = [focusedRow2Index, subIndex];
              const unlocked = isUnlocked(path);
              const focused = isFocused(path);

              return (
                <button
                  key={subIndex}
                  onClick={() => handleSlotClick(path)}
                  disabled={unlocked}
                  className={`
                    relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg
                    border-2 transition-all
                    ${unlocked
                      ? 'bg-slate-dark border-success-green cursor-default'
                      : focused
                        ? 'bg-slate-medium border-hextech-gold shadow-gold cursor-default'
                        : 'bg-slate-medium border-slate-light hover:border-hextech-gold cursor-pointer'
                    }
                  `}
                >
                  {unlocked ? (
                    <>
                      <img
                        src={getItemImageUrl(subChild.itemId, dataVersion)}
                        alt={subChild.itemName}
                        className="w-12 h-12"
                      />
                      <span className="absolute top-2 right-2 text-xl text-success-green font-bold">
                        ✓
                      </span>
                      <p className="text-xs text-white text-center">{subChild.itemName}</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-slate-dark border-2 border-slate-light rounded flex items-center justify-center">
                        <span className="text-3xl text-slate-light">?</span>
                      </div>
                      <p className="text-xs text-slate-light">Click to build</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Show combine gold cost for Row 3 if requiresComponentGold */}
          {requiresComponentGold && focusedRow2Component.goldCost > 0 && (
            <div className="text-center">
              <p className="text-lg text-hextech-gold">
                Combine Cost: {formatGold(focusedRow2Component.goldCost)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
