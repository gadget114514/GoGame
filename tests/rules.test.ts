import { describe, expect, it } from 'vitest';
import { BLACK, EMPTY, Goban, WHITE } from '../src/game/Goban';
import {
  formatBoardCoordinate,
  formatCoordinate,
  rowLabel
} from '../src/game/BoardSize';

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

  it('formats Go coordinates accurately skipping I', () => {
    // 19x19 corners and tengen
    expect(formatCoordinate(0, 19)).toBe('A19');
    expect(formatCoordinate(18 * 19, 19)).toBe('A1');
    expect(formatCoordinate(18, 19)).toBe('T19');
    expect(formatCoordinate(18 * 19 + 18, 19)).toBe('T1');
    // Tengen (row 9, col 9) -> col index 9 is K (since I is skipped: A,B,C,D,E,F,G,H,J,K), row 19-9=10
    expect(formatCoordinate(9 * 19 + 9, 19)).toBe('K10');
    // D4: col 3, row 15 (19 - 15 = 4)
    expect(formatCoordinate(15 * 19 + 3, 19)).toBe('D4');
    // Pass and invalid coordinates
    expect(formatCoordinate(null, 19)).toBe('Pass');
    expect(formatCoordinate(-1, 19)).toBe('Pass');
  });


  it('formats board coordinates in screen and standard modes', () => {
    const index = at(9, 5, 6);
    const base = {
      size: 9,
      perspective: 'black' as const
    };

    expect(
      formatBoardCoordinate(index, {
        ...base,
        columns: 'numbers',
        rowOrigin: 'top'
      })
    ).toBe('7,6');

    expect(
      formatBoardCoordinate(index, {
        ...base,
        columns: 'letters',
        rowOrigin: 'bottom'
      })
    ).toBe('G4');

    expect(
      formatBoardCoordinate(index, {
        ...base,
        columns: 'letters',
        rowOrigin: 'bottom',
        perspective: 'white'
      })
    ).toBe('C6');

    expect(rowLabel(5, 'numbers', 'top', 9)).toBe('6');
    expect(rowLabel(5, 'numbers', 'bottom', 9)).toBe('4');
  });

  it('clones game state independently', () => {
    const goban = new Goban(9, 7);
    goban.play(at(9, 2, 2));
    const clone = goban.clone();
    expect(clone.board[at(9, 2, 2)]).toBe(BLACK);
    expect(clone.side).toBe(WHITE);
    expect(clone.moves.length).toBe(1);

    clone.play(at(9, 3, 3));
    expect(clone.board[at(9, 3, 3)]).toBe(WHITE);
    expect(goban.board[at(9, 3, 3)]).toBe(EMPTY);
  });
});
