import { describe, expect, it } from 'vitest';
import { BLACK, EMPTY, Goban, WHITE } from '../src/game/Goban';

const at = (size: number, row: number, col: number) => row * size + col;

describe('Goban rules', () => {
  it('captures a stone with no liberties', () => {
    const goban = new Goban(9, 7);
    goban.board[at(9, 0, 0)] = WHITE;
    goban.board[at(9, 0, 1)] = BLACK;
    goban.side = BLACK;

    expect(goban.play(at(9, 1, 0))).toBe(true);
    expect(goban.board[at(9, 0, 0)]).toBe(EMPTY);
  });

  it('forbids suicide', () => {
    const goban = new Goban(9, 7);
    goban.board[at(9, 0, 1)] = BLACK;
    goban.board[at(9, 1, 0)] = BLACK;
    goban.side = WHITE;

    expect(goban.play(at(9, 0, 0))).toBe(false);
    expect(goban.board[at(9, 0, 0)]).toBe(EMPTY);
  });

  it('applies the simple ko rule', () => {
    const goban = new Goban(9, 7);
    // Standard ko: Black captures at (2,2), leaving a single stone in atari.
    goban.board[at(9, 2, 1)] = WHITE;
    goban.board[at(9, 1, 1)] = BLACK;
    goban.board[at(9, 3, 1)] = BLACK;
    goban.board[at(9, 2, 0)] = BLACK;
    goban.board[at(9, 1, 2)] = WHITE;
    goban.board[at(9, 3, 2)] = WHITE;
    goban.board[at(9, 2, 3)] = WHITE;
    goban.side = BLACK;

    expect(goban.play(at(9, 2, 2))).toBe(true);
    expect(goban.board[at(9, 2, 1)]).toBe(EMPTY);
    expect(goban.ko).toBe(at(9, 2, 1));
    expect(goban.legal(at(9, 2, 1))).toBe(false);
  });

  it('undo restores the previous position', () => {
    const goban = new Goban(9, 7);
    goban.play(at(9, 4, 4));
    const before = goban.board.slice();

    goban.play(at(9, 4, 5));
    expect(goban.undo()).toBe(true);
    expect(Array.from(goban.board)).toEqual(Array.from(before));
    expect(goban.side).toBe(WHITE);
  });

  it('scores area on every board size', () => {
    for (const size of [9, 13, 19] as const) {
      const goban = new Goban(size, 0);
      goban.board.fill(BLACK);
      const result = goban.score();
      expect(result.black).toBe(size * size);
      expect(result.white).toBe(0);
      expect(result.winner).toBe(BLACK);
    }
  });

  it('round-trips SGF with komi and size', () => {
    const goban = new Goban(9, 7);
    goban.play(at(9, 2, 2));
    goban.play(at(9, 6, 6));
    goban.pass();
    const sgf = goban.toSGF();

    const loaded = new Goban(9, 0);
    loaded.loadSGF(sgf);
    expect(loaded.size).toBe(9);
    expect(loaded.komi).toBe(7);
    expect(loaded.board[at(9, 2, 2)]).toBe(BLACK);
    expect(loaded.board[at(9, 6, 6)]).toBe(WHITE);
    expect(loaded.moves.length).toBe(3);
  });
});
