import type { BoardSize } from '../game/BoardSize';

export type AILevel = 'dan' | 'kyu';

function baseUrl(): string {
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? base : `${base}/`;
}

export function modelUrl(size: BoardSize, level: AILevel): string {
  return `${baseUrl()}models/${level}-${size}x${size}/model.json`;
}

export function rootUrlFor(url: string): string {
  return url.slice(0, url.lastIndexOf('/') + 1);
}
