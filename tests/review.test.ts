import { describe, expect, it } from 'vitest';
import { BLACK, WHITE } from '../src/game/Goban';
import {
  detectMistakes,
  humanWinrate,
  REVIEW_MAX_PROBLEMS,
  REVIEW_MISTAKE_THRESHOLD,
  winrateLoss
} from '../src/game/review';

describe('review win rate helpers', () => {
  it('converts Black win rate for each player', () => {
    expect(humanWinrate(BLACK, 0.72)).toBeCloseTo(0.72);
    expect(humanWinrate(WHITE, 0.72)).toBeCloseTo(0.28);
  });

  it('reports loss from the moving player perspective', () => {
    expect(winrateLoss(BLACK, 0.7, 0.55)).toBeCloseTo(0.15);
    expect(winrateLoss(WHITE, 0.7, 0.85)).toBeCloseTo(0.15);
    expect(winrateLoss(WHITE, 0.5, 0.45)).toBeCloseTo(-0.05);
  });
});

describe('detectMistakes', () => {
  const base = {
    playedMove: 10,
    color: BLACK
  };

  it('filters out moves below the threshold', () => {
    const result = detectMistakes([
      { ...base, step: 1, beforeBlackWinrate: 0.5, afterBlackWinrate: 0.47 },
      { ...base, step: 2, beforeBlackWinrate: 0.5, afterBlackWinrate: 0.39 }
    ]);

    expect(result.map((candidate) => candidate.step)).toEqual([2]);
    expect(result[0].loss).toBeCloseTo(0.11);
  });

  it('honours the threshold argument', () => {
    const result = detectMistakes(
      [{ ...base, step: 1, beforeBlackWinrate: 0.5, afterBlackWinrate: 0.46 }],
      0.02
    );
    expect(result).toHaveLength(1);
  });

  it('tracks White mistakes using White perspective', () => {
    const result = detectMistakes([
      {
        ...base,
        color: WHITE,
        step: 1,
        beforeBlackWinrate: 0.3,
        afterBlackWinrate: 0.45
      }
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].loss).toBeCloseTo(0.15);
  });

  it('keeps the largest mistakes and returns them chronologically', () => {
    const inputs = Array.from({ length: REVIEW_MAX_PROBLEMS + 4 }, (_, index) => ({
      ...base,
      step: index + 1,
      beforeBlackWinrate: 0.8,
      afterBlackWinrate: 0.8 - (index + 2) * 0.05
    }));

    const result = detectMistakes(inputs);

    expect(result).toHaveLength(REVIEW_MAX_PROBLEMS);
    expect(result[0].step).toBe(5);
    expect(result[result.length - 1].step).toBe(14);
    expect(result.map((candidate) => candidate.step)).toEqual(
      [...result.map((candidate) => candidate.step)].sort((a, b) => a - b)
    );
  });

  it('uses the documented default threshold', () => {
    expect(REVIEW_MISTAKE_THRESHOLD).toBeCloseTo(0.08);
  });
});
