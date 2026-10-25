import type { Goban } from '../game/Goban';
import type { Evaluation } from './KataGoEngine';

/**
 * Pick a move from a policy evaluation. The pass wins when its probability
 * beats the highest policy board entry; otherwise the best legal board move is
 * played. The top three candidates are shuffled for the first few plies to vary
 * openings.
 */
export function selectMove(
  goban: Goban,
  evaluation: Evaluation,
  random: () => number = Math.random
): number | null {
  const n = goban.size;
  const total = n * n;

  const candidates: number[] = [];
  for (let i = 0; i < total; i++) {
    if (evaluation.policy[i] > 0) candidates.push(i);
  }
  candidates.sort((a, b) => evaluation.policy[b] - evaluation.policy[a]);

  const passProbability = evaluation.policy[total] ?? 0;
  const topProbability = candidates.length > 0 ? evaluation.policy[candidates[0]] : 0;
  if (passProbability > topProbability && passProbability > 0) return null;

  let ordered = candidates;
  if (goban.moveNumber <= 6 && candidates.length > 1) {
    const head = candidates.slice(0, 3);
    for (let i = head.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [head[i], head[j]] = [head[j], head[i]];
    }
    ordered = head.concat(candidates.slice(3));
  }

  for (const candidate of ordered) {
    if (goban.legal(candidate)) return candidate;
  }

  // No policy candidate is legal (rare): fall back to any legal move.
  for (let i = 0; i < total; i++) {
    if (goban.legal(i)) return i;
  }

  return null;
}
