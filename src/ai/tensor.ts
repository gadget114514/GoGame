import { BLACK, WHITE, opposite, type Goban, type Player } from '../game/Goban';
import type { BoardSize } from '../game/BoardSize';

export const CHANNELS = 22;
export const GLOBAL_INPUTS = 19;
export const KOMI_INDEX = 5;

export interface TensorLayout {
  actual: BoardSize;
  grid: BoardSize;
  padded: boolean;
}

export interface InputTensors {
  bin: Float32Array;
  global: Float32Array;
  layout: TensorLayout;
}

/**
 * Build KataGo `bin_inputs` / `global_inputs` for an arbitrary board size.
 * When the model grid is larger than the board (padded inference for 9x9/13x13),
 * the board is written into the top-left corner and channel 0 ("on board")
 * is zeroed outside it.
 */
export function buildInputs(goban: Goban, grid: BoardSize): InputTensors {
  const n = goban.size;
  const m = grid;
  const padded = n !== m;
  const area = m * m;
  const bin = new Float32Array(area * CHANNELS);
  const global = new Float32Array(GLOBAL_INPUTS);

  const us: Player = goban.side;
  const them = opposite(us);
  const toGrid = (index: number) => {
    const row = Math.floor(index / n);
    const col = index % n;
    return row * m + col;
  };

  // Group liberties for atari features.
  const libertyCount = new Uint8Array(n * n);
  const seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const value = goban.board[i];
    if ((value !== BLACK && value !== WHITE) || seen[i]) continue;
    const group = goban.groupAt(i);
    const liberties = group.liberties.size;
    for (const stone of group.stones) {
      libertyCount[stone] = liberties;
      seen[stone] = 1;
    }
  }

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const source = row * n + col;
      const target = row * m + col;
      const base = target * CHANNELS;
      const value = goban.board[source];

      // 0: on board
      bin[base] = 1;
      // 1: stones of the side to move, 2: opponent stones
      if (value === us) bin[base + 1] = 1;
      else if (value === them) bin[base + 2] = 1;

      if (value === BLACK || value === WHITE) {
        const liberties = libertyCount[source];
        if (liberties === 1) bin[base + 3] = 1;
        else if (liberties === 2) bin[base + 4] = 1;
        else if (liberties === 3) bin[base + 5] = 1;
      }
    }
  }

  // 6: ko point
  if (goban.ko >= 0 && goban.ko < n * n) {
    bin[toGrid(goban.ko) * CHANNELS + 6] = 1;
  }

  // 9..13: last five moves, starting with the opponent (we are to move).
  let expected: Player = them;
  let slot = 9;
  const history = goban.moves;
  for (let k = 0; k < 5 && k < history.length; k++) {
    const record = history[history.length - 1 - k];
    if (record.move === null) {
      global[k] = 1;
    } else if (record.color === expected) {
      const target = toGrid(record.move);
      bin[target * CHANNELS + slot] = 1;
    }
    expected = opposite(expected);
    slot++;
  }

  // 5: komi from the perspective of the side to move, scaled like KataGo.
  const selfKomi = us === WHITE ? goban.komi : -goban.komi;
  global[KOMI_INDEX] = selfKomi / 20;

  return { bin, global, layout: { actual: n, grid: m, padded } };
}

/**
 * KataGo policy heads are masked logits: illegal/off-board points sit around
 * -5000, legal points are raw scores. Softmax turns one head into probabilities.
 */
export function softmaxPolicy(logits: Float32Array): Float32Array {
  const out = new Float32Array(logits.length);
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  if (!Number.isFinite(max)) return out;

  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const value = Math.exp(logits[i] - max);
    out[i] = value;
    sum += value;
  }
  if (sum > 0) {
    for (let i = 0; i < out.length; i++) out[i] /= sum;
  }
  return out;
}

/** Slice the model policy (grid grid + pass) down to the actual board + pass. */
export function extractPolicy(raw: Float32Array, layout: TensorLayout): Float32Array {
  const { actual: n, grid: m } = layout;
  const out = new Float32Array(n * n + 1);
  if (n === m) {
    out.set(raw.subarray(0, n * n + 1));
    return out;
  }
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      out[row * n + col] = raw[row * m + col];
    }
  }
  out[n * n] = raw[m * m];
  return out;
}

/** Slice the model ownership grid down to the actual board. */
export function extractOwnership(raw: Float32Array, layout: TensorLayout): Float32Array {
  const { actual: n, grid: m } = layout;
  const out = new Float32Array(n * n);
  if (n === m) {
    out.set(raw.subarray(0, n * n));
    return out;
  }
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      out[row * n + col] = raw[row * m + col];
    }
  }
  return out;
}
