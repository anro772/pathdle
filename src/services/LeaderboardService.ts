/**
 * Leaderboard Service - Supabase integration for global leaderboard
 *
 * Handles:
 * - Submitting scores to the global leaderboard
 * - Fetching top scores
 * - Calculating percentile rank ("You're better than X% of players!")
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://lwsgilmangkddcaxlzdu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c2dpbG1hbmdrZGRjYXhsemR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTcyMjAsImV4cCI6MjA4MzQ3MzIyMH0.wPP9zCZ2dbvoPKRim0fpLNImyUPlPOH8B-u_sAPLYIo';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// Types
// ============================================================================

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  level: number;
  created_at: string;
}

export interface SubmitScoreResult {
  success: boolean;
  percentile: number;
  error?: string;
}

export interface LeaderboardData {
  topScores: LeaderboardEntry[];
  totalPlayers: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Submit a score to the leaderboard and get percentile rank
 */
export async function submitScore(
  playerName: string,
  level: number
): Promise<SubmitScoreResult> {
  try {
    // Validate input
    const trimmedName = playerName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      return {
        success: false,
        percentile: 0,
        error: 'Name must be 1-20 characters',
      };
    }

    // Insert score
    const { error: insertError } = await supabase
      .from('scores')
      .insert({ player_name: trimmedName, level });

    if (insertError) {
      console.error('Failed to insert score:', insertError);
      return {
        success: false,
        percentile: 0,
        error: 'Failed to save score',
      };
    }

    // Get percentile using the database function
    const { data: percentileData, error: percentileError } = await supabase
      .rpc('get_percentile', { player_level: level });

    if (percentileError) {
      console.error('Failed to get percentile:', percentileError);
      // Score was saved, just can't get percentile
      return {
        success: true,
        percentile: 0,
      };
    }

    return {
      success: true,
      percentile: Number(percentileData) || 0,
    };
  } catch (err) {
    console.error('Unexpected error submitting score:', err);
    return {
      success: false,
      percentile: 0,
      error: 'Network error',
    };
  }
}

/**
 * Get percentile for a level without submitting (for preview)
 */
export async function getPercentile(level: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_percentile', { player_level: level });

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
export async function getTopScores(limit: number = 10): Promise<LeaderboardData> {
  try {
    // Get top scores
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('*')
      .order('level', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (scoresError) {
      console.error('Failed to fetch top scores:', scoresError);
      return { topScores: [], totalPlayers: 0 };
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Failed to fetch total count:', countError);
    }

    return {
      topScores: scores || [],
      totalPlayers: count || 0,
    };
  } catch (err) {
    console.error('Unexpected error fetching leaderboard:', err);
    return { topScores: [], totalPlayers: 0 };
  }
}
