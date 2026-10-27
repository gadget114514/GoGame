import { BLACK } from '../game/Goban';
import type { BoardSize } from '../game/BoardSize';

/**
 * Ownership thresholds for the six chess ranks, measured from the stone's own
 * color perspective. A stone in enemy influence (negative own ownership) is
 * treated as dead regardless of its magnitude.
 */
export const RANK_THRESHOLDS: Record<BoardSize, readonly [number, number, number, number, number, number]> = {
  9: [0.75, 0.66, 0.52, 0.48, 0.46, 0.4],
  13: [0.75, 0.66, 0.5, 0.46, 0.44, 0.4],
  19: [0.65, 0.6, 0.48, 0.46, 0.4, 0]
};

export interface PieceRank {
  /** 0 = pawn, 1 = knight, 2 = bishop, 3 = rook, 4 = queen, 5 = king. */
  rank: number;
  /** True when the network expects the stone's color to lose this point. */
  dead: boolean;
}

export function pieceRank(
  ownership: number,
  color: number,
  lastMove: boolean,
  size: BoardSize = 19
): PieceRank {
  const own = color === BLACK ? ownership : -ownership;
  const dead = own < 0;

  if (lastMove && !dead) return { rank: 5, dead: false };
  if (dead) return { rank: 0, dead: true };

  const thresholds = RANK_THRESHOLDS[size];
  for (let i = 0; i < thresholds.length; i++) {
    if (own >= thresholds[i]) return { rank: 5 - i, dead: false };
  }
  return { rank: 0, dead: false };
}

export function rankLegendRanges(size: BoardSize): {
  king: string;
  queen: string;
  rook: string;
  bishop: string;
  knight: string;
  pawn: string;
} {
  const t = RANK_THRESHOLDS[size];
  const pct = (value: number) => Math.round(value * 100);
  const band = (lower: number, upper: number) => {
    const high = pct(upper - 0.01);
    return `${pct(lower)}–${high}%`;
  };
  return {
    king: `${pct(t[0])}%+`,
    queen: band(t[1], t[0]),
    rook: band(t[2], t[1]),
    bishop: band(t[3], t[2]),
    knight: band(t[4], t[3]),
    pawn: `0–${pct(t[4] - 0.01)}%`
  };
}
