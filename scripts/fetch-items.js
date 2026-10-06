/**
 * Script to fetch League of Legends items from DataDragon
 * and save them as a static JSON file for bundling.
 *
 * Run this script during build or manually when League updates.
 *
 * Usage:
 *   node scripts/fetch-items.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DDRAGON_VERSION_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'items-data.json');

async function fetchLatestVersion() {
  console.log('📡 Fetching latest DataDragon version...');
  const response = await fetch(DDRAGON_VERSION_URL);
  const versions = await response.json();
  const latestVersion = versions[0];
  console.log(`✅ Latest version: ${latestVersion}`);
  return latestVersion;
}

async function fetchItems(version) {
  console.log(`📡 Fetching items data for version ${version}...`);
  const itemsUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;
  const response = await fetch(itemsUrl);
  const data = await response.json();
  console.log(`✅ Fetched ${Object.keys(data.data).length} items`);
  return data;
}

async function main() {
  try {
    console.log('🚀 Starting DataDragon items fetch...\n');

    // Ensure public directory exists
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    // Fetch latest version and items
    const version = await fetchLatestVersion();
    const itemsData = await fetchItems(version);

    // Save to public directory
    const output = {
      version,
      fetchedAt: new Date().toISOString(),
      data: itemsData.data
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n✅ Items data saved to: ${OUTPUT_FILE}`);
    console.log(`📦 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
    console.log(`🎮 Version: ${version}`);
    console.log(`📅 Fetched at: ${output.fetchedAt}`);
    console.log('\n✨ Done! Items data is ready for bundling.');
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    process.exit(1);
  }
}

main();
