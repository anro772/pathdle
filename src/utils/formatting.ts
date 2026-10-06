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
 * Formats points with thousands separators.
 *
 * @example
 * formatPoints(3450); // "3,450"
 */
export function formatPoints(points: number): string {
  return points.toLocaleString('en-US');
}

/**
 * Formats a duration as HH:MM:SS (for the Daily countdown).
 *
 * @example
 * formatCountdown(3_723_000); // "01:02:03"
 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}
