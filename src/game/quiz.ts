import type { Goban } from './Goban';
import type { Evaluation } from '../ai/KataGoEngine';

export type QuizRole = 'best' | 'worst' | 'random';

export interface QuizCandidate {
  index: number;
  role: QuizRole;
}

export const QUIZ_CANDIDATE_COUNT = 5;

/**
 * Choose quiz candidates for the side to move: the highest-policy move, the
 * lowest-policy legal move, and random legal distractors.
 */
export function selectQuizCandidates(
  goban: Goban,
  evaluation: Evaluation,
  random: () => number = Math.random,
  count: number = QUIZ_CANDIDATE_COUNT
): QuizCandidate[] {
  const legal: number[] = [];
  for (let index = 0; index < goban.area; index++) {
    if (goban.legal(index)) legal.push(index);
  }
  if (legal.length < 2) return [];

  let best = legal[0];
  let worst = legal[0];
  for (const index of legal) {
    if (evaluation.policy[index] > evaluation.policy[best]) best = index;
    if (evaluation.policy[index] < evaluation.policy[worst]) worst = index;
  }
  if (worst === best) {
    const alternative = legal.find((index) => index !== best);
    if (alternative === undefined) return [];
    worst = alternative;
  }

  const candidates: QuizCandidate[] = [
    { index: best, role: 'best' },
    { index: worst, role: 'worst' }
  ];
  const pool = legal.filter((index) => index !== best && index !== worst);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const desired = Math.min(count, legal.length);
  for (const index of pool) {
    if (candidates.length >= desired) break;
    candidates.push({ index, role: 'random' });
  }
  return candidates;
}
