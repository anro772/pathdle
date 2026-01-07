/**
 * Returns the Tailwind CSS color class for the timer based on urgency.
 *
 * Color scheme:
 * - 10-6s: Blue (calm)
 * - 5-3s: Yellow (warning)
 * - 2-0s: Red (urgent)
 *
 * @param seconds - Seconds remaining on timer
 * @returns Tailwind color class string
 *
 * @example
 * getTimerColor(10); // "text-blue-400"
 * getTimerColor(5);  // "text-yellow-400"
 * getTimerColor(2);  // "text-red-500"
 */
export function getTimerColor(seconds: number): string {
  if (seconds > 5) return 'text-blue-400';
  if (seconds > 2) return 'text-yellow-400';
  return 'text-red-500';
}

/**
 * Determines if the timer should show a pulse animation.
 *
 * Timer pulses when time is critically low (≤ 2 seconds).
 *
 * @param seconds - Seconds remaining on timer
 * @returns True if timer should pulse
 *
 * @example
 * shouldTimerPulse(10); // false
 * shouldTimerPulse(2);  // true
 * shouldTimerPulse(0);  // true
 */
export function shouldTimerPulse(seconds: number): boolean {
  return seconds <= 2;
}
