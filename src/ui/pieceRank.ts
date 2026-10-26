import { BLACK } from '../game/Goban';

/**
 * Ownership thresholds for the six chess ranks, measured from the stone's own
 * color perspective. A stone in enemy influence (negative own ownership) is
 * treated as dead regardless of its magnitude.
 */
export const RANK_THRESHOLDS = [0.75, 0.60, 0.50, 0.40, 0.25] as const;

export interface PieceRank {
  /** 0 = pawn, 1 = knight, 2 = bishop, 3 = rook, 4 = queen, 5 = king. */
  rank: number;
  /** True when the network expects the stone's color to lose this point. */
  dead: boolean;
}

export function pieceRank(ownership: number, color: number, lastMove: boolean): PieceRank {
  const own = color === BLACK ? ownership : -ownership;
  const dead = own < 0;

  if (lastMove && !dead) return { rank: 5, dead: false };
  if (dead) return { rank: 0, dead: true };

  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (own >= RANK_THRESHOLDS[i]) return { rank: 5 - i, dead: false };
  }
  return { rank: 0, dead: false };
}
