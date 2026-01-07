/**
 * Formats a gold amount for display with 'g' suffix.
 *
 * @param amount - Gold amount (e.g., 350, 2800)
 * @returns Formatted gold string (e.g., "350g", "2800g")
 *
 * @example
 * formatGold(350);  // "350g"
 * formatGold(2800); // "2800g"
 */
export function formatGold(amount: number): string {
  return `${amount}g`;
}

/**
 * Truncates item names that are too long for display.
 *
 * @param name - Item name (e.g., "Youmuu's Ghostblade")
 * @param maxLength - Maximum characters before truncation (default: 15)
 * @returns Truncated name with ellipsis if needed
 *
 * @example
 * formatItemName("Long Sword");              // "Long Sword"
 * formatItemName("Rabadon's Deathcap", 12);  // "Rabadon's..."
 */
export function formatItemName(name: string, maxLength: number = 15): string {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.slice(0, maxLength - 3)}...`;
}
