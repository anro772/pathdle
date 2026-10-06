/**
 * RecipeTree Component
 *
 * Read-only, compact view of an item's full build path (any depth).
 * Used by the run recap and the Codex.
 */

import type { ComponentNode } from '../types/items';
import { useGameStore } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { tooltipProps } from '../utils/tooltip';
import { Gold } from './Gold';

function Node({ node, depth }: { node: ComponentNode; depth: number }) {
  const dataVersion = useGameStore(s => s.dataVersion);
  if (!dataVersion) return null;

  const size = depth === 0 ? 'w-14 h-14' : depth === 1 ? 'w-11 h-11' : 'w-9 h-9';

  return (
    <div className="flex flex-col items-center min-w-0">
      <img
        {...tooltipProps(node.itemId)}
        src={getItemImageUrl(node.itemId, dataVersion)}
        alt={node.itemName}
        className={`${size} rounded border ${depth === 0 ? 'border-hextech-gold' : 'border-hextech-gold/30'}`}
      />
      <p className="font-ui text-[0.75rem] text-hextech-gold-light/70 text-center leading-tight mt-0.5 line-clamp-1 max-w-20">
        {node.itemName}
      </p>
      {node.goldCost > 0 && node.children.length > 0 && (
        <p className="font-ui text-[0.75rem] text-yellow-400"><Gold amount={node.goldCost} prefix="+" /></p>
      )}
      {node.children.length > 0 && (
        <div className="relative flex gap-1.5 sm:gap-3 mt-1.5 pt-1.5 border-t border-hextech-gold/30">
          {node.children.map((child, i) => (
            <Node key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RecipeTree({ tree }: { tree: ComponentNode }) {
  return (
    <div className="flex justify-center overflow-x-auto py-1">
      <Node node={tree} depth={0} />
    </div>
  );
}
