/**
 * Leaderboard Service - Supabase integration for global leaderboards
 *
 * Handles:
 * - Submitting scores (Endless all-time, Daily per day)
 * - Fetching top scores
 * - Calculating percentile rank ("You're better than X% of players!")
 *
 * Uses the browser-safe publishable key. Row-level security on the `scores`
 * table only allows reading and inserting (see supabase/schema.sql).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration (from .env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Create Supabase client (null when not configured - leaderboard is then hidden)
const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ============================================================================
// Types
// ============================================================================

export type LeaderboardMode = 'endless' | 'daily';

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  mode: LeaderboardMode;
  score: number;
  level: number;
  daily_date: string | null;
  created_at: string;
}

export interface ScoreSubmission {
  playerName: string;
  mode: LeaderboardMode;
  score: number;
  level: number;
  /** Required for daily scores (YYYY-MM-DD) */
  dailyDate?: string;
}

export interface SubmitScoreResult {
  success: boolean;
  percentile: number;
  entryId?: string;
  error?: string;
}

export interface LeaderboardData {
  topScores: LeaderboardEntry[];
  totalPlayers: number;
}

// ============================================================================
// API Functions
// ============================================================================

/** Whether a leaderboard backend is configured */
export function isLeaderboardEnabled(): boolean {
  return supabase !== null;
}

/**
 * Submit a score to the leaderboard and get percentile rank
 */
export async function submitScore(submission: ScoreSubmission): Promise<SubmitScoreResult> {
  if (!supabase) {
    return { success: false, percentile: 0, error: 'Leaderboard unavailable' };
  }

  const trimmedName = submission.playerName.trim();
  if (trimmedName.length < 1 || trimmedName.length > 20) {
    return { success: false, percentile: 0, error: 'Name must be 1-20 characters' };
  }

  try {
    // Percentile is computed against everyone else, before inserting our own score
    const percentile = await getPercentile(submission.mode, submission.score, submission.dailyDate);

    const { data, error: insertError } = await supabase
      .from('scores')
      .insert({
        player_name: trimmedName,
        mode: submission.mode,
        score: submission.score,
        level: submission.level,
        daily_date: submission.mode === 'daily' ? submission.dailyDate : null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert score:', insertError);
      // 23514 = check constraint (e.g. score_plausible: more points than the level allows)
      const error = insertError.code === '23514' ? 'Score failed verification' : 'Failed to save score';
      return { success: false, percentile: 0, error };
    }

    return { success: true, percentile, entryId: data?.id };
  } catch (err) {
    console.error('Unexpected error submitting score:', err);
    return { success: false, percentile: 0, error: 'Network error' };
  }
}

/**
 * Get percentile for a score without submitting (for preview)
 */
export async function getPercentile(mode: LeaderboardMode, score: number, dailyDate?: string): Promise<number> {
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase.rpc('get_percentile', {
      p_mode: mode,
      p_score: score,
      p_date: mode === 'daily' ? dailyDate : null,
    });

    if (error) {
      console.error('Failed to get percentile:', error);
      return 0;
    }

    return Number(data) || 0;
  } catch (err) {
    console.error('Unexpected error getting percentile:', err);
    return 0;
  }
}

/**
 * Fetch top scores from the leaderboard
 */
export async function getTopScores(
  mode: LeaderboardMode,
  dailyDate?: string,
  limit: number = 10
): Promise<LeaderboardData> {
  if (!supabase) return { topScores: [], totalPlayers: 0 };

  try {
    let scoresQuery = supabase
      .from('scores')
      .select('*')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    let countQuery = supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('mode', mode);

    if (mode === 'daily' && dailyDate) {
      scoresQuery = scoresQuery.eq('daily_date', dailyDate);
      countQuery = countQuery.eq('daily_date', dailyDate);
    }

    const [{ data: scores, error: scoresError }, { count, error: countError }] = await Promise.all([
      scoresQuery,
      countQuery,
    ]);

    if (scoresError) {
      console.error('Failed to fetch top scores:', scoresError);
      return { topScores: [], totalPlayers: 0 };
    }
    if (countError) {
      console.error('Failed to fetch total count:', countError);
    }

    return {
      topScores: (scores as LeaderboardEntry[]) || [],
      totalPlayers: count || 0,
    };
  } catch (err) {
    console.error('Unexpected error fetching leaderboard:', err);
    return { topScores: [], totalPlayers: 0 };
  }
}
