import { describe, expect, it } from 'vitest';
import { Goban } from '../src/game/Goban';
import {
  CHANNELS,
  buildInputs,
  extractOwnership,
  extractPolicy,
  softmaxPolicy
} from '../src/ai/tensor';
import type { BoardSize } from '../src/game/BoardSize';

describe('KataGo tensor encoding', () => {
  it('marks only the real board as on-board when padded', () => {
    const goban = new Goban(9, 7);
    const { bin, layout } = buildInputs(goban, 19);
    expect(layout).toEqual({ actual: 9, grid: 19, padded: true });
    expect(bin.length).toBe(19 * 19 * CHANNELS);

    let onBoard = 0;
    for (let i = 0; i < 19 * 19; i++) {
      if (bin[i * CHANNELS] === 1) onBoard++;
    }
    expect(onBoard).toBe(81);
  });

  it('encodes stones from the side-to-move perspective and komi', () => {
    const goban = new Goban(9, 7);
    goban.play(0);
    const { bin, global } = buildInputs(goban, 9);

    // White to move: black stone is the opponent.
    expect(bin[0 * CHANNELS + 2]).toBe(1);
    expect(bin[0 * CHANNELS + 1]).toBe(0);
    expect(global[5]).toBeCloseTo(7 / 20);
  });

  it('extracts valid policy positions from padded output', () => {
    const raw = new Float32Array(19 * 19 + 1);
    raw[0] = 0.5;
    raw[1] = 0.25;
    raw[18] = 0.9; // outside the 9x9 board
    raw[19 * 19] = 0.75; // pass

    const layout = { actual: 9 as BoardSize, grid: 19 as BoardSize, padded: true };
    const policy = extractPolicy(raw, layout);
    expect(policy.length).toBe(82);
    expect(policy[0]).toBeCloseTo(0.5);
    expect(policy[1]).toBeCloseTo(0.25);
    expect(policy[81]).toBeCloseTo(0.75);
  });

  it('turns masked policy logits into probabilities', () => {
    const logits = new Float32Array([Math.log(3), Math.log(1), -5000, -5000]);
    const policy = softmaxPolicy(logits);
    expect(policy[0]).toBeCloseTo(0.75);
    expect(policy[1]).toBeCloseTo(0.25);
    expect(policy[2]).toBe(0);
    expect(policy.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it('extracts ownership from padded output', () => {
    const raw = new Float32Array(19 * 19);
    raw[0] = 1;
    raw[1] = -1;
    raw[19] = 0.5;

    const layout = { actual: 9 as BoardSize, grid: 19 as BoardSize, padded: true };
    const ownership = extractOwnership(raw, layout);
    expect(ownership.length).toBe(81);
    expect(ownership[0]).toBe(1);
    expect(ownership[1]).toBe(-1);
    expect(ownership[9]).toBeCloseTo(0.5);
  });
});
