/**
 * Draws a shareable PNG result card (1200x630) on a canvas.
 * Item icons come from DataDragon, which serves CORS headers, so the canvas stays exportable.
 */

import type { LevelOutcome } from '../types/items';
import { getItemImageUrl } from '../services/RiotService';

const WIDTH = 1200;
const HEIGHT = 630;

const OUTCOME_COLORS: Record<LevelOutcome | 'none', string> = {
  perfect: '#0BDA51',
  mistake: '#F0B232',
  failed: '#E84057',
  none: '#1E3A5F',
};

export interface ShareImageInput {
  title: string;
  subtitle: string;
  score: number;
  outcomes: LevelOutcome[];
  /** Pad the grid with empty cells up to this many (Daily) */
  totalLevels?: number;
  itemIds: string[];
  dataVersion: string;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareImage(input: ShareImageInput): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  await document.fonts?.ready;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#010A13');
  bg.addColorStop(1, '#0A1428');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH / 2, 0, 0, WIDTH / 2, 0, 600);
  glow.addColorStop(0, 'rgba(10, 200, 185, 0.18)');
  glow.addColorStop(1, 'rgba(10, 200, 185, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Frame
  ctx.strokeStyle = 'rgba(200, 170, 110, 0.5)';
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, WIDTH - 48, HEIGHT - 48, 18);
  ctx.stroke();

  // Title
  const gold = ctx.createLinearGradient(0, 70, 0, 150);
  gold.addColorStop(0, '#F0E6D2');
  gold.addColorStop(0.6, '#C8AA6E');
  gold.addColorStop(1, '#785A28');
  ctx.fillStyle = gold;
  ctx.textAlign = 'center';
  ctx.font = '700 84px Cinzel, Georgia, serif';
  ctx.fillText('PATHDLE', WIDTH / 2, 145);

  ctx.fillStyle = '#0AC8B9';
  ctx.font = '600 34px Rajdhani, sans-serif';
  ctx.fillText(input.title, WIDTH / 2, 195);

  // Score
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 64px Cinzel, Georgia, serif';
  ctx.fillText(`${input.score.toLocaleString('en-US')} pts`, WIDTH / 2, 280);
  ctx.fillStyle = 'rgba(240, 230, 210, 0.6)';
  ctx.font = '500 28px Rajdhani, sans-serif';
  ctx.fillText(input.subtitle, WIDTH / 2, 320);

  // Outcome grid (max 20 cells across two rows)
  const cells: Array<LevelOutcome | 'none'> = [...input.outcomes];
  while (input.totalLevels && cells.length < input.totalLevels) cells.push('none');
  const shown = cells.slice(0, 20);
  const perRow = Math.min(10, shown.length);
  const size = 46;
  const gap = 12;
  const rowWidth = perRow * size + (perRow - 1) * gap;
  shown.forEach((outcome, i) => {
    const x = (WIDTH - rowWidth) / 2 + (i % 10) * (size + gap);
    const y = 350 + Math.floor(i / 10) * (size + gap);
    ctx.fillStyle = OUTCOME_COLORS[outcome];
    roundRect(ctx, x, y, size, size, 8);
    ctx.fill();
  });

  // Item icons from the run
  const icons = (await Promise.all(
    input.itemIds.slice(0, 12).map(id => loadImage(getItemImageUrl(id, input.dataVersion)))
  )).filter((img): img is HTMLImageElement => img !== null);
  const iconSize = 56;
  const iconGap = 10;
  const iconsWidth = icons.length * iconSize + Math.max(0, icons.length - 1) * iconGap;
  const iconsY = shown.length > 10 ? 480 : 440;
  icons.forEach((img, i) => {
    const x = (WIDTH - iconsWidth) / 2 + i * (iconSize + iconGap);
    ctx.drawImage(img, x, iconsY, iconSize, iconSize);
    ctx.strokeStyle = 'rgba(200, 170, 110, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, iconsY, iconSize, iconSize);
  });

  ctx.fillStyle = 'rgba(240, 230, 210, 0.35)';
  ctx.font = '500 22px Rajdhani, sans-serif';
  ctx.fillText(window.location.host, WIDTH / 2, HEIGHT - 50);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/** Shares the image natively on phones, otherwise downloads it */
export async function shareOrDownloadImage(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] }) && /Mobi|Android/i.test(navigator.userAgent)) {
    await navigator.share({ files: [file] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
