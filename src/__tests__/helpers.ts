import fs from 'fs';
import path from 'path';
import type { ItemsResponse } from '../types/items';

/** Loads the bundled DataDragon snapshot (public/items-data.json) */
export function loadItems(): ItemsResponse {
  const file = path.join(process.cwd(), 'public', 'items-data.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { version: raw.version, data: raw.data };
}
