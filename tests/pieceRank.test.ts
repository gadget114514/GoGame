import { describe, expect, it } from 'vitest';
import { BLACK, WHITE } from '../src/game/Goban';
import { pieceRank } from '../src/ui/pieceRank';

describe('pieceRank', () => {
  it('maps ownership thresholds to ranks', () => {
    expect(pieceRank(0.65, BLACK, false).rank).toBe(5);
    expect(pieceRank(0.64, BLACK, false).rank).toBe(4);
    expect(pieceRank(0.60, BLACK, false).rank).toBe(4);
    expect(pieceRank(0.59, BLACK, false).rank).toBe(3);
    expect(pieceRank(0.48, BLACK, false).rank).toBe(3);
    expect(pieceRank(0.47, BLACK, false).rank).toBe(2);
    expect(pieceRank(0.46, BLACK, false).rank).toBe(2);
    expect(pieceRank(0.45, BLACK, false).rank).toBe(1);
    expect(pieceRank(0.40, BLACK, false).rank).toBe(1);
    expect(pieceRank(0.39, BLACK, false).rank).toBe(0);
  });

  it('uses the stone color perspective', () => {
    expect(pieceRank(-0.9, WHITE, false).rank).toBe(5);
    expect(pieceRank(0.9, WHITE, false)).toEqual({ rank: 0, dead: true });
  });

  it('uses board-size specific thresholds', () => {
    expect(pieceRank(0.75, BLACK, false, 9).rank).toBe(5);
    expect(pieceRank(0.74, BLACK, false, 9).rank).toBe(4);
    expect(pieceRank(0.66, BLACK, false, 9).rank).toBe(4);
    expect(pieceRank(0.65, BLACK, false, 9).rank).toBe(3);
    expect(pieceRank(0.52, BLACK, false, 9).rank).toBe(3);
    expect(pieceRank(0.51, BLACK, false, 9).rank).toBe(2);
    expect(pieceRank(0.48, BLACK, false, 9).rank).toBe(2);
    expect(pieceRank(0.47, BLACK, false, 9).rank).toBe(1);
    expect(pieceRank(0.46, BLACK, false, 9).rank).toBe(1);
    expect(pieceRank(0.45, BLACK, false, 9).rank).toBe(0);

    expect(pieceRank(0.75, BLACK, false, 13).rank).toBe(5);
    expect(pieceRank(0.66, BLACK, false, 13).rank).toBe(4);
    expect(pieceRank(0.65, BLACK, false, 13).rank).toBe(3);
    expect(pieceRank(0.5, BLACK, false, 13).rank).toBe(3);
    expect(pieceRank(0.49, BLACK, false, 13).rank).toBe(2);
    expect(pieceRank(0.46, BLACK, false, 13).rank).toBe(2);
    expect(pieceRank(0.45, BLACK, false, 13).rank).toBe(1);
    expect(pieceRank(0.44, BLACK, false, 13).rank).toBe(1);
    expect(pieceRank(0.43, BLACK, false, 13).rank).toBe(0);
  });

  it('marks negative own ownership as dead', () => {
    expect(pieceRank(-0.2, BLACK, false)).toEqual({ rank: 0, dead: true });
    expect(pieceRank(0, BLACK, false)).toEqual({ rank: 0, dead: false });
  });

  it('promotes a live last move to king', () => {
    expect(pieceRank(0.05, BLACK, true)).toEqual({ rank: 5, dead: false });
  });

  it('does not promote a dead last move', () => {
    expect(pieceRank(-0.2, BLACK, true)).toEqual({ rank: 0, dead: true });
  });
});
