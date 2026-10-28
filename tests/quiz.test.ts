import { describe, expect, it } from 'vitest';
import { BLACK, Goban, WHITE } from '../src/game/Goban';
import type { Evaluation } from '../src/ai/KataGoEngine';
import {
  QUIZ_CANDIDATE_COUNT,
  selectQuizCandidates
} from '../src/game/quiz';

function evaluation(policy: Float32Array): Evaluation {
  return {
    policy,
    ownership: new Float32Array(policy.length - 1),
    scoreLead: 0,
    winrate: 0.5,
    padded: false
  };
}

describe('selectQuizCandidates', () => {
  it('marks the best and worst legal moves plus random distractors', () => {
    const goban = new Goban(9, 7);
    const policy = new Float32Array(goban.area + 1).fill(0.01);
    policy[10] = 0.9;
    policy[20] = 0.0001;

    const result = selectQuizCandidates(goban, evaluation(policy), () => 0);

    expect(result).toHaveLength(QUIZ_CANDIDATE_COUNT);
    expect(result.find((candidate) => candidate.role === 'best')?.index).toBe(10);
    expect(result.find((candidate) => candidate.role === 'worst')?.index).toBe(20);

    const indices = result.map((candidate) => candidate.index);
    expect(new Set(indices).size).toBe(indices.length);
    expect(
      result.filter((candidate) => candidate.role === 'random')
    ).toHaveLength(QUIZ_CANDIDATE_COUNT - 2);
  });

  it('keeps the best and worst distinct when every policy is equal', () => {
    const goban = new Goban(9, 7);
    const policy = new Float32Array(goban.area + 1).fill(0.5);

    const result = selectQuizCandidates(goban, evaluation(policy), () => 0);
    const best = result.find((candidate) => candidate.role === 'best');
    const worst = result.find((candidate) => candidate.role === 'worst');

    expect(best).toBeDefined();
    expect(worst).toBeDefined();
    expect(worst?.index).not.toBe(best?.index);
  });

  it('returns no candidates when fewer than two moves are legal', () => {
    const goban = new Goban(9, 7);
    goban.board.fill(BLACK);
    goban.board[40] = 0;
    goban.side = WHITE;

    expect(
      selectQuizCandidates(goban, evaluation(new Float32Array(82).fill(0.5)))
    ).toEqual([]);
  });

  it('honours a custom candidate count', () => {
    const goban = new Goban(9, 7);
    const policy = new Float32Array(goban.area + 1).fill(0.1);

    const result = selectQuizCandidates(goban, evaluation(policy), () => 0, 3);

    expect(result).toHaveLength(3);
    expect(result.map((candidate) => candidate.role)).toEqual([
      'best',
      'worst',
      'random'
    ]);
  });
});
