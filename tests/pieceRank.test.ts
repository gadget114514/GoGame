import { describe, expect, it } from 'vitest';
import { BLACK, WHITE } from '../src/game/Goban';
import { pieceRank } from '../src/ui/pieceRank';

describe('pieceRank', () => {
  it('maps ownership thresholds to ranks', () => {
    expect(pieceRank(0.75, BLACK, false).rank).toBe(4);
    expect(pieceRank(0.74, BLACK, false).rank).toBe(3);
    expect(pieceRank(0.55, BLACK, false).rank).toBe(3);
    expect(pieceRank(0.54, BLACK, false).rank).toBe(2);
    expect(pieceRank(0.35, BLACK, false).rank).toBe(2);
    expect(pieceRank(0.34, BLACK, false).rank).toBe(1);
    expect(pieceRank(0.15, BLACK, false).rank).toBe(1);
    expect(pieceRank(0.14, BLACK, false).rank).toBe(0);
  });

  it('uses the stone color perspective', () => {
    expect(pieceRank(-0.8, WHITE, false).rank).toBe(4);
    expect(pieceRank(0.8, WHITE, false)).toEqual({ rank: 0, dead: true });
  });

  it('marks negative own ownership as dead', () => {
    expect(pieceRank(-0.2, BLACK, false)).toEqual({ rank: 0, dead: true });
    expect(pieceRank(0, BLACK, false)).toEqual({ rank: 0, dead: false });
  });

  it('promotes a live last move to queen', () => {
    expect(pieceRank(0.05, BLACK, true)).toEqual({ rank: 4, dead: false });
  });

  it('does not promote a dead last move', () => {
    expect(pieceRank(-0.2, BLACK, true)).toEqual({ rank: 0, dead: true });
  });
});
