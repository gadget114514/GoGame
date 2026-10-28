import { BLACK, type Player } from './Goban';

/** Minimum win-rate drop (in percentage points) for a move to count as a mistake. */
export const REVIEW_MISTAKE_THRESHOLD = 0.08;

/** Maximum number of problems offered in a single review session. */
export const REVIEW_MAX_PROBLEMS = 10;

/** A move within this win-rate margin of the best move is accepted as correct. */
export const REVIEW_CORRECT_TOLERANCE = 0.02;

export interface ReviewCandidateInput {
  /** History index of the move that was played. */
  step: number;
  color: Player;
  playedMove: number;
  /** Black win rate before the move was played. */
  beforeBlackWinrate: number;
  /** Black win rate after the move was played. */
  afterBlackWinrate: number;
}

export interface ReviewCandidate extends ReviewCandidateInput {
  /** Win-rate loss for the player who made the move, in [0, 1]. */
  loss: number;
}

/** Convert a Black-perspective win rate to the perspective of `color`. */
export function humanWinrate(color: Player, blackWinrate: number): number {
  return color === BLACK ? blackWinrate : 1 - blackWinrate;
}

/** Win-rate lost by playing a move, from the moving player's perspective. */
export function winrateLoss(
  color: Player,
  beforeBlackWinrate: number,
  afterBlackWinrate: number
): number {
  return (
    humanWinrate(color, beforeBlackWinrate) -
    humanWinrate(color, afterBlackWinrate)
  );
}

/**
 * Filter raw move evaluations down to the largest mistakes, then return them
 * in chronological order so a review session follows the game forward.
 */
export function detectMistakes(
  inputs: readonly ReviewCandidateInput[],
  threshold: number = REVIEW_MISTAKE_THRESHOLD,
  limit: number = REVIEW_MAX_PROBLEMS
): ReviewCandidate[] {
  return inputs
    .map((input) => ({
      ...input,
      loss: winrateLoss(
        input.color,
        input.beforeBlackWinrate,
        input.afterBlackWinrate
      )
    }))
    .filter((candidate) => candidate.loss >= threshold)
    .sort((a, b) => b.loss - a.loss)
    .slice(0, Math.max(0, limit))
    .sort((a, b) => a.step - b.step);
}
