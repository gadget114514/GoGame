import { describe, expect, it } from 'vitest';
import { BLACK, WHITE, Goban } from '../src/game/Goban';
import { generateSGF, parseSGF, indexToSGFCoord, sgfCoordToIndex, escapeSGFText } from '../src/game/Sgf';

describe('SGF Parser and Generator', () => {
  it('converts between board index and SGF coordinates', () => {
    // 19x19: Tengen is row 9, col 9 -> "jj"
    expect(indexToSGFCoord(9 * 19 + 9, 19)).toBe('jj');
    expect(sgfCoordToIndex('jj', 19)).toBe(9 * 19 + 9);

    // Top-left: row 0, col 0 -> "aa"
    expect(indexToSGFCoord(0, 19)).toBe('aa');
    expect(sgfCoordToIndex('aa', 19)).toBe(0);

    // Pass
    expect(indexToSGFCoord(null, 19)).toBe('');
    expect(sgfCoordToIndex('', 19)).toBeNull();
    expect(sgfCoordToIndex('tt', 19)).toBeNull();
  });

  it('generates valid SGF from Goban game state', () => {
    const goban = new Goban(19, 7.5);
    goban.play(9 * 19 + 9); // Tengen
    goban.pass();
    const sgf = generateSGF(goban, {
      blackPlayer: 'Player1',
      whitePlayer: 'KataGo',
      result: 'B+R'
    });

    expect(sgf).toContain('SZ[19]');
    expect(sgf).toContain('KM[7.5]');
    expect(sgf).toContain('PB[Player1]');
    expect(sgf).toContain('PW[KataGo]');
    expect(sgf).toContain('RE[B+R]');
    expect(sgf).toContain(';B[jj]');
    expect(sgf).toContain(';W[]');
  });

  it('parses SGF with handicap, comments, and passes', () => {
    const rawSgf = `
      (;GM[1]FF[4]CA[UTF-8]SZ[19]KM[6.5]RU[Japanese]PB[Lee Sedol]PW[AlphaGo]RE[W+R]DT[2016-03-09]
      HA[2]AB[pd][dp]
      ;W[pp]C[First move by White]
      ;B[cd]
      ;W[]C[White passes]
      ;B[tt]C[Black passes with tt]
      )
    `;

    const parsed = parseSGF(rawSgf);
    expect(parsed.size).toBe(19);
    expect(parsed.komi).toBe(6.5);
    expect(parsed.blackPlayer).toBe('Lee Sedol');
    expect(parsed.whitePlayer).toBe('AlphaGo');
    expect(parsed.result).toBe('W+R');
    expect(parsed.date).toBe('2016-03-09');

    // 2 handicap stones
    expect(parsed.handicapStones.length).toBe(2);
    expect(parsed.handicapStones).toContain(sgfCoordToIndex('pd', 19));
    expect(parsed.handicapStones).toContain(sgfCoordToIndex('dp', 19));

    // Moves
    expect(parsed.moves.length).toBe(4);
    expect(parsed.moves[0]).toEqual({
      color: WHITE,
      move: sgfCoordToIndex('pp', 19),
      comment: 'First move by White'
    });
    expect(parsed.moves[1]).toEqual({
      color: BLACK,
      move: sgfCoordToIndex('cd', 19),
      comment: undefined
    });
    expect(parsed.moves[2]).toEqual({
      color: WHITE,
      move: null,
      comment: 'White passes'
    });
    expect(parsed.moves[3]).toEqual({
      color: BLACK,
      move: null,
      comment: 'Black passes with tt'
    });
  });

  it('properly escapes brackets and backslashes in SGF metadata to prevent injection', () => {
    expect(escapeSGFText('Player [Dan\\]')).toBe('Player [Dan\\\\\\\]');

    const goban = new Goban(19, 7.5);
    const sgf = generateSGF(goban, {
      blackPlayer: 'Malicious]PW[FakePlayer',
      whitePlayer: 'KataGo\\AI',
      result: 'B+R]'
    });

    expect(sgf).toContain('PB[Malicious\\]PW[FakePlayer]');
    expect(sgf).toContain('PW[KataGo\\\\AI]');
    expect(sgf).toContain('RE[B+R\\]]');
  });
});
