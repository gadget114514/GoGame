import { describe, expect, it } from 'vitest';
import { BLACK, WHITE, Goban } from '../src/game/Goban';
import { selectMove } from '../src/ai/select';
import type { Evaluation } from '../src/ai/KataGoEngine';

function evaluation(policy: Float32Array): Evaluation {
  return {
    policy,
    ownership: new Float32Array(81),
    scoreLead: 0,
    winrate: 0.5,
    padded: true
  };
}

function settled(goban: Goban): void {
  for (let i = 0; i < 7; i++) {
    goban.moves.push({ color: i % 2 === 0 ? BLACK : WHITE, move: null });
  }
}

describe('selectMove', () => {
  it('plays the best board move when it beats pass', () => {
    const goban = new Goban(9, 7);
    settled(goban);
    const policy = new Float32Array(82);
    policy[40] = 0.5;
    policy[81] = 0.1;
    expect(selectMove(goban, evaluation(policy))).toBe(40);
  });

  it('passes when the policy favors pass', () => {
    const goban = new Goban(9, 7);
    settled(goban);
    const policy = new Float32Array(82);
    policy[40] = 0.1;
    policy[81] = 0.5;
    expect(selectMove(goban, evaluation(policy))).toBeNull();
  });

  it('skips an illegal top move', () => {
    const goban = new Goban(9, 7);
    settled(goban);
    goban.board[40] = BLACK;
    const policy = new Float32Array(82);
    policy[40] = 0.5;
    policy[41] = 0.3;
    policy[81] = 0.01;
    expect(selectMove(goban, evaluation(policy))).toBe(41);
  });

  it('returns null when the board has no legal move', () => {
    const goban = new Goban(9, 7);
    settled(goban);
    goban.board.fill(BLACK);
    const policy = new Float32Array(82);
    policy[81] = 0.9;
    expect(selectMove(goban, evaluation(policy))).toBeNull();
  });
});
