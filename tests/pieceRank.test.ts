import { describe, expect, it } from 'vitest';
import { BLACK, WHITE } from '../src/game/Goban';
import {
  isValidRankThresholds,
  pieceRank,
  rankLegendRanges,
  type RankThresholds
} from '../src/ui/pieceRank';

describe('pieceRank', () => {
  it('maps ownership thresholds to ranks', () => {
    expect(pieceRank(0.75, BLACK, false).rank).toBe(5);
    expect(pieceRank(0.74, BLACK, false).rank).toBe(4);
    expect(pieceRank(0.60, BLACK, false).rank).toBe(4);
    expect(pieceRank(0.59, BLACK, false).rank).toBe(3);
    expect(pieceRank(0.50, BLACK, false).rank).toBe(3);
    expect(pieceRank(0.49, BLACK, false).rank).toBe(2);
    expect(pieceRank(0.45, BLACK, false).rank).toBe(2);
    expect(pieceRank(0.44, BLACK, false).rank).toBe(1);
    expect(pieceRank(0.36, BLACK, false).rank).toBe(1);
    expect(pieceRank(0.35, BLACK, false).rank).toBe(0);
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

  it('accepts valid custom thresholds', () => {
    const custom: RankThresholds = [0.8, 0.7, 0.6, 0.5, 0.4];
    expect(pieceRank(0.8, BLACK, false, 19, custom).rank).toBe(5);
    expect(pieceRank(0.7, BLACK, false, 19, custom).rank).toBe(4);
    expect(pieceRank(0.6, BLACK, false, 19, custom).rank).toBe(3);
    expect(pieceRank(0.5, BLACK, false, 19, custom).rank).toBe(2);
    expect(pieceRank(0.4, BLACK, false, 19, custom).rank).toBe(1);
    expect(pieceRank(0.39, BLACK, false, 19, custom).rank).toBe(0);
    expect(rankLegendRanges(19, custom)).toEqual({
      king: '80%+',
      queen: '70–79%',
      rook: '60–69%',
      bishop: '50–59%',
      knight: '40–49%',
      pawn: '0–39%'
    });
  });

  it('rejects contradictory thresholds', () => {
    expect(isValidRankThresholds([0.75, 0.6, 0.5, 0.45, 0.36])).toBe(true);
    expect(isValidRankThresholds([0.6, 0.7, 0.5, 0.45, 0.36])).toBe(false);
    expect(isValidRankThresholds([0.75, 0.75, 0.5, 0.45, 0.36])).toBe(false);
    expect(isValidRankThresholds([0.75, 0.6, 0.5, 0.45, 0])).toBe(false);
    expect(isValidRankThresholds([0.75, 0.6, 0.5, 0.45])).toBe(false);
    expect(isValidRankThresholds([1.2, 0.6, 0.5, 0.45, 0.36])).toBe(false);
  });
});
