/**
 * Script to build a Challenger "meta snapshot" from the Riot API
 * and save it as a static JSON file for bundling.
 *
 * The snapshot only ENRICHES the game (fun facts, champion icons on the
 * level-complete card). It never changes which items can appear.
 *
 * Requires a Riot API key (dev keys expire after 24h, so the output is
 * committed and re-generated whenever a fresh key is available).
 *
 * Usage:
 *   RIOT_API_KEY=RGAPI-... node scripts/fetch-meta.js
 *   (or put RIOT_API_KEY in .env)
 *
 * Optional env: RIOT_PLATFORM (default euw1), RIOT_REGION (default europe),
 *               META_PLAYERS (default 40), META_MATCHES_PER_PLAYER (default 5)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const API_KEY = process.env.RIOT_API_KEY;
const PLATFORM = process.env.RIOT_PLATFORM || 'euw1';
const REGION = process.env.RIOT_REGION || 'europe';
const PLAYERS = parseInt(process.env.META_PLAYERS || '40');
const MATCHES_PER_PLAYER = parseInt(process.env.META_MATCHES_PER_PLAYER || '5');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'meta-data.json');

/** Dev keys allow 100 requests / 2 minutes -> stay at ~1 request per 1.25s */
const REQUEST_INTERVAL_MS = 1250;

let lastRequestAt = 0;

async function riotGet(url) {
  const wait = lastRequestAt + REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const response = await fetch(url, { headers: { 'X-Riot-Token': API_KEY } });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('retry-after') || '10');
    console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return riotGet(url);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function main() {
  if (!API_KEY) {
    console.error('❌ RIOT_API_KEY is not set (env or .env)');
    process.exit(1);
  }

  console.log(`🚀 Building Challenger meta snapshot (${PLATFORM})...\n`);

  // 1. Challenger ladder
  const league = await riotGet(
    `https://${PLATFORM}.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`
  );
  const players = [...league.entries]
    .sort((a, b) => b.leaguePoints - a.leaguePoints)
    .slice(0, PLAYERS)
    .map(e => e.puuid)
    .filter(Boolean);
  console.log(`✅ ${players.length} Challenger players`);

  // 2. Recent ranked solo match IDs
  const matchIds = new Set();
  for (const puuid of players) {
    try {
      const ids = await riotGet(
        `https://${REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&count=${MATCHES_PER_PLAYER}`
      );
      ids.forEach(id => matchIds.add(id));
    } catch (err) {
      console.warn(`⚠️  ${err.message}`);
    }
  }
  console.log(`✅ ${matchIds.size} unique matches`);

  // 3. Aggregate final items per participant
  const items = {};
  const patches = {};
  let matchCount = 0;
  let playerCount = 0;
  let done = 0;

  for (const matchId of matchIds) {
    done++;
    let match;
    try {
      match = await riotGet(`https://${REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`);
    } catch (err) {
      console.warn(`⚠️  ${err.message}`);
      continue;
    }
    if (done % 20 === 0) console.log(`   ...${done}/${matchIds.size} matches`);

    const patch = match.info.gameVersion.split('.').slice(0, 2).join('.');
    patches[patch] = (patches[patch] || 0) + 1;
    matchCount++;

    for (const p of match.info.participants) {
      playerCount++;
      const owned = new Set(
        [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter(id => id && id > 0).map(String)
      );
      for (const id of owned) {
        const entry = items[id] || (items[id] = { players: 0, wins: 0, champs: {} });
        entry.players++;
        if (p.win) entry.wins++;
        entry.champs[p.championName] = (entry.champs[p.championName] || 0) + 1;
      }
    }
  }

  const output = {
    patch: Object.entries(patches).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    platform: PLATFORM,
    tier: 'CHALLENGER',
    matchCount,
    playerCount,
    generatedAt: new Date().toISOString(),
    items: Object.fromEntries(
      Object.entries(items).map(([id, e]) => [
        id,
        {
          players: e.players,
          pickRate: +(e.players / playerCount).toFixed(4),
          winRate: +(e.wins / e.players).toFixed(4),
          topChamps: Object.entries(e.champs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count })),
        },
      ])
    ),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✅ Meta snapshot saved to: ${OUTPUT_FILE}`);
  console.log(`📊 ${matchCount} matches, ${playerCount} players, ${Object.keys(items).length} items, patch ${output.patch}`);
}

main().catch(err => {
  console.error('❌ Error building meta snapshot:', err);
  process.exit(1);
});
