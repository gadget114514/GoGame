import { describe, expect, it } from 'vitest';
import { BLACK, Goban, WHITE } from '../src/game/Goban';
import { detectTwoEyes, isTrueEye } from '../src/game/eyes';

const at = (size: number, row: number, col: number) => row * size + col;

describe('two-eye detection', () => {
  it('finds a group with two true eyes and the wall between them', () => {
    const goban = new Goban(9, 7);
    for (let col = 1; col <= 5; col++) {
      goban.board[at(9, 1, col)] = BLACK;
      goban.board[at(9, 3, col)] = BLACK;
    }
    for (const col of [1, 3, 5]) goban.board[at(9, 2, col)] = BLACK;

    const analysis = detectTwoEyes(goban);

    expect(analysis.groups).toHaveLength(1);
    expect(analysis.groups[0].eyes).toEqual([at(9, 2, 2), at(9, 2, 4)]);
    expect(analysis.groups[0].pair).toEqual([at(9, 2, 2), at(9, 2, 4)]);
    expect(analysis.eyeOwner.get(at(9, 2, 2))).toBe(BLACK);
    expect(analysis.eyeOwner.get(at(9, 2, 4))).toBe(BLACK);
  });

  it('does not report a group with only one true eye', () => {
    const goban = new Goban(9, 7);
    for (let col = 1; col <= 3; col++) {
      goban.board[at(9, 1, col)] = BLACK;
      goban.board[at(9, 3, col)] = BLACK;
    }
    goban.board[at(9, 2, 1)] = BLACK;
    goban.board[at(9, 2, 3)] = BLACK;

    expect(isTrueEye(goban, at(9, 2, 2), BLACK)).toBe(true);
    expect(detectTwoEyes(goban).groups).toHaveLength(0);
  });

  it('rejects a false eye with two uncontrolled diagonals', () => {
    const goban = new Goban(9, 7);
    goban.board[at(9, 1, 2)] = BLACK;
    goban.board[at(9, 3, 2)] = BLACK;
    goban.board[at(9, 2, 1)] = BLACK;
    goban.board[at(9, 2, 3)] = BLACK;
    goban.board[at(9, 1, 1)] = WHITE;
    goban.board[at(9, 1, 3)] = WHITE;

    expect(isTrueEye(goban, at(9, 2, 2), BLACK)).toBe(false);
  });

  it('accepts an eye with one uncontrolled diagonal', () => {
    const goban = new Goban(9, 7);
    goban.board[at(9, 1, 2)] = BLACK;
    goban.board[at(9, 3, 2)] = BLACK;
    goban.board[at(9, 2, 1)] = BLACK;
    goban.board[at(9, 2, 3)] = BLACK;
    goban.board[at(9, 1, 1)] = BLACK;
    goban.board[at(9, 1, 3)] = BLACK;
    goban.board[at(9, 3, 1)] = BLACK;

    expect(isTrueEye(goban, at(9, 2, 2), BLACK)).toBe(true);
  });


  it('reports living false eyes alongside true eyes', () => {
    const goban = new Goban(9, 7);
    for (let row = 1; row <= 4; row++) {
      for (let col = 1; col <= 6; col++) {
        goban.board[at(9, row, col)] = BLACK;
      }
    }
    goban.board[at(9, 2, 2)] = 0;
    goban.board[at(9, 2, 5)] = 0;
    goban.board[at(9, 1, 4)] = WHITE;
    goban.board[at(9, 3, 4)] = WHITE;

    const analysis = detectTwoEyes(goban);

    expect(analysis.groups).toHaveLength(1);
    expect(analysis.groups[0].eyes).toContain(at(9, 2, 2));
    expect(analysis.groups[0].falseEyes).toContain(at(9, 2, 5));
    expect(analysis.falseEyeOwner.get(at(9, 2, 5))).toBe(BLACK);
    expect(analysis.groups[0].pair).toEqual([at(9, 2, 2), at(9, 2, 5)]);
  });
  it('recognizes a true eye on the board edge', () => {
    const goban = new Goban(9, 7);
    goban.board[at(9, 0, 1)] = BLACK;
    goban.board[at(9, 1, 0)] = BLACK;
    goban.board[at(9, 1, 1)] = BLACK;

    expect(isTrueEye(goban, at(9, 0, 0), BLACK)).toBe(true);
  });
});
