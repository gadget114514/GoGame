import { BLACK } from '../game/Goban';
import type { BoardSize } from '../game/BoardSize';

/**
 * Minimum ownership thresholds for king, queen, rook, bishop and knight,
 * measured from the stone's own color perspective. Pawn covers 0 up to the
 * knight threshold; a stone in enemy influence (negative own ownership) is
 * treated as dead regardless of its magnitude.
 */
export type RankThresholds = readonly [number, number, number, number, number];

export const DEFAULT_RANK_THRESHOLDS: Record<BoardSize, RankThresholds> = {
  9: [0.75, 0.66, 0.52, 0.48, 0.46],
  13: [0.75, 0.66, 0.5, 0.46, 0.44],
  19: [0.75, 0.6, 0.5, 0.45, 0.36]
};

export interface PieceRank {
  /** 0 = pawn, 1 = knight, 2 = bishop, 3 = rook, 4 = queen, 5 = king. */
  rank: number;
  /** True when the network expects the stone's color to lose this point. */
  dead: boolean;
}

export function defaultThresholds(size: BoardSize): RankThresholds {
  return [...DEFAULT_RANK_THRESHOLDS[size]] as RankThresholds;
}

export function isValidRankThresholds(value: unknown): value is RankThresholds {
  if (!Array.isArray(value) || value.length !== 5) return false;
  const values = value as unknown[];
  if (
    !values.every(
      (entry) =>
        typeof entry === 'number' &&
        Number.isFinite(entry) &&
        entry > 0 &&
        entry <= 1
    )
  ) {
    return false;
  }
  for (let i = 1; i < values.length; i++) {
    if ((values[i] as number) >= (values[i - 1] as number)) return false;
  }
  return true;
}

export function pieceRank(
  ownership: number,
  color: number,
  lastMove: boolean,
  size: BoardSize = 19,
  thresholds: RankThresholds = DEFAULT_RANK_THRESHOLDS[size]
): PieceRank {
  const own = color === BLACK ? ownership : -ownership;
  const dead = own < 0;

  if (lastMove && !dead) return { rank: 5, dead: false };
  if (dead) return { rank: 0, dead: true };

  for (let i = 0; i < thresholds.length; i++) {
    if (own >= thresholds[i]) return { rank: 5 - i, dead: false };
  }
  return { rank: 0, dead: false };
}

export function rankLegendRanges(
  size: BoardSize,
  thresholds: RankThresholds = DEFAULT_RANK_THRESHOLDS[size]
): {
  king: string;
  queen: string;
  rook: string;
  bishop: string;
  knight: string;
  pawn: string;
} {
  const pct = (value: number) => Math.round(value * 100);
  const band = (lower: number, upper: number) => {
    const high = pct(upper - 0.01);
    return `${pct(lower)}–${high}%`;
  };
  return {
    king: `${pct(thresholds[0])}%+`,
    queen: band(thresholds[1], thresholds[0]),
    rook: band(thresholds[2], thresholds[1]),
    bishop: band(thresholds[3], thresholds[2]),
    knight: band(thresholds[4], thresholds[3]),
    pawn: `0–${pct(thresholds[4] - 0.01)}%`
  };
}
