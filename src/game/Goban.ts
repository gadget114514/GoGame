import { neighbors, DEFAULT_KOMI, type BoardSize } from './BoardSize';

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Player = typeof BLACK | typeof WHITE;
export type Stone = 0 | 1 | 2;

export interface MoveRecord {
  color: Player;
  /** Board index, or null for a pass. */
  move: number | null;
  /** Policy probability (or heuristic weight) recorded when the move was played. */
  weight?: number;
}

export interface ScoreResult {
  black: number;
  white: number;
  komi: number;
  /** BLACK, WHITE, or 0 for a draw. */
  winner: 0 | 1 | 2;
  margin: number;
}

interface Snapshot {
  board: Uint8Array;
  side: Player;
  ko: number;
  lastMove: number | null;
}

export interface GroupInfo {
  stones: number[];
  liberties: Set<number>;
  color: Stone;
}

export function opposite(color: Player): Player {
  return color === BLACK ? WHITE : BLACK;
}

/**
 * Board-size agnostic Go game state. Chinese area scoring.
 */
export class Goban {
  readonly size: BoardSize;
  readonly area: number;

  board: Uint8Array;
  side: Player = BLACK;
  ko = -1;
  komi: number;
  moves: MoveRecord[] = [];
  lastMove: number | null = null;

  private snapshots: Snapshot[] = [];

  constructor(size: BoardSize, komi: number = DEFAULT_KOMI[size]) {
    this.size = size;
    this.area = size * size;
    this.komi = komi;
    this.board = new Uint8Array(this.area);
  }

  clone(): Goban {
    const copy = new Goban(this.size, this.komi);
    copy.board = new Uint8Array(this.board);
    copy.side = this.side;
    copy.ko = this.ko;
    copy.lastMove = this.lastMove;
    copy.moves = this.moves.map((m) => ({ ...m }));
    return copy;
  }

  at(index: number): number {
    return this.board[index] ?? EMPTY;
  }

  neighbors(index: number): number[] {
    return neighbors(index, this.size);
  }

  /** Flood-fill the group at `index` on the given board. */
  groupAt(index: number, board: Uint8Array = this.board): GroupInfo {
    const color = board[index] as Stone;
    if (color !== BLACK && color !== WHITE) {
      return { stones: [], liberties: new Set(), color: EMPTY };
    }
    const stones: number[] = [];
    const liberties = new Set<number>();
    const seen = new Uint8Array(board.length);
    const stack = [index];
    seen[index] = 1;
    while (stack.length) {
      const current = stack.pop()!;
      stones.push(current);
      for (const n of this.neighbors(current)) {
        if (seen[n]) continue;
        const value = board[n];
        if (value === EMPTY) {
          seen[n] = 1;
          liberties.add(n);
        } else if (value === color) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    return { stones, liberties, color };
  }

  /** True if `side` (defaults to side to move) may play at `index`. */
  legal(index: number, side: Player = this.side): boolean {
    if (index < 0 || index >= this.area) return false;
    if (this.board[index] !== EMPTY) return false;
    if (index === this.ko) return false;

    const trial = this.board.slice();
    trial[index] = side;
    const enemy = opposite(side);
    const captured = new Set<number>();

    for (const n of this.neighbors(index)) {
      if (trial[n] !== enemy) continue;
      const group = this.groupAt(n, trial);
      if (group.liberties.size === 0) {
        for (const stone of group.stones) captured.add(stone);
      }
    }
    for (const stone of captured) trial[stone] = EMPTY;

    const own = this.groupAt(index, trial);
    return own.liberties.size > 0;
  }

  play(index: number): boolean {
    if (!this.legal(index)) return false;
    this.snapshot();

    const color = this.side;
    this.board[index] = color;

    const enemy = opposite(color);
    const captured = new Set<number>();
    for (const n of this.neighbors(index)) {
      if (this.board[n] !== enemy) continue;
      const group = this.groupAt(n);
      if (group.liberties.size === 0) {
        for (const stone of group.stones) captured.add(stone);
      }
    }
    for (const stone of captured) this.board[stone] = EMPTY;

    this.ko = -1;
    if (captured.size === 1) {
      const own = this.groupAt(index);
      if (own.liberties.size === 1) this.ko = captured.values().next().value as number;
    }

    this.moves.push({ color, move: index });
    this.lastMove = index;
    this.side = enemy;
    return true;
  }

  pass(): void {
    this.snapshot();
    this.moves.push({ color: this.side, move: null });
    this.lastMove = null;
    this.ko = -1;
    this.side = opposite(this.side);
  }

  undo(): boolean {
    const snapshot = this.snapshots.pop();
    if (!snapshot) return false;
    this.board = snapshot.board;
    this.side = snapshot.side;
    this.ko = snapshot.ko;
    this.lastMove = snapshot.lastMove;
    this.moves.pop();
    return true;
  }

  get moveNumber(): number {
    return this.moves.length;
  }

  get consecutivePasses(): number {
    let count = 0;
    for (let i = this.moves.length - 1; i >= 0; i--) {
      if (this.moves[i].move === null) count++;
      else break;
    }
    return count;
  }

  score(): ScoreResult {
    let black = 0;
    let white = 0;
    const visited = new Uint8Array(this.area);

    for (let i = 0; i < this.area; i++) {
      if (this.board[i] === BLACK) black++;
      else if (this.board[i] === WHITE) white++;
    }

    for (let i = 0; i < this.area; i++) {
      if (this.board[i] !== EMPTY || visited[i]) continue;
      const region: number[] = [];
      const stack = [i];
      visited[i] = 1;
      let touchesBlack = false;
      let touchesWhite = false;

      while (stack.length) {
        const current = stack.pop()!;
        region.push(current);
        for (const n of this.neighbors(current)) {
          const value = this.board[n];
          if (value === EMPTY) {
            if (!visited[n]) {
              visited[n] = 1;
              stack.push(n);
            }
          } else if (value === BLACK) touchesBlack = true;
          else if (value === WHITE) touchesWhite = true;
        }
      }

      if (touchesBlack && !touchesWhite) black += region.length;
      else if (touchesWhite && !touchesBlack) white += region.length;
    }

    const whiteTotal = white + this.komi;
    const diff = black - whiteTotal;
    return {
      black,
      white: whiteTotal,
      komi: this.komi,
      winner: diff > 0 ? BLACK : diff < 0 ? WHITE : 0,
      margin: Math.abs(diff)
    };
  }

  reset(): void {
    this.board = new Uint8Array(this.area);
    this.side = BLACK;
    this.ko = -1;
    this.moves = [];
    this.lastMove = null;
    this.snapshots = [];
  }

  private snapshot(): void {
    this.snapshots.push({
      board: this.board.slice(),
      side: this.side,
      ko: this.ko,
      lastMove: this.lastMove
    });
  }

  toSGF(): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let sgf = `(;GM[1]FF[4]CA[UTF-8]AP[GoGame3D:0.1]SZ[${this.size}]KM[${this.komi}]RU[Chinese]`;
    for (const move of this.moves) {
      const prefix = move.color === BLACK ? 'B' : 'W';
      if (move.move === null) {
        sgf += `;${prefix}[]`;
      } else {
        const row = Math.floor(move.move / this.size);
        const col = move.move % this.size;
        sgf += `;${prefix}[${letters[col]}${letters[row]}]`;
      }
    }
    return `${sgf})`;
  }

  loadSGF(sgf: string): void {
    this.reset();
    const sizeMatch = sgf.match(/SZ\[(\d+)\]/);
    if (sizeMatch) {
      const parsed = Number(sizeMatch[1]);
      if (parsed !== this.size) {
        throw new Error(`SGF is for a ${parsed}x${parsed} board`);
      }
    }
    const komiMatch = sgf.match(/KM\[([\d.]+)\]/);
    if (komiMatch) this.komi = Number(komiMatch[1]);

    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const moveRe = /;\s*([BW])\[([a-z]{0,2})\]/g;
    let match: RegExpExecArray | null;
    while ((match = moveRe.exec(sgf)) !== null) {
      const color = match[1] === 'B' ? BLACK : WHITE;
      if (this.side !== color) {
        // Skip malformed move ordering rather than corrupting state.
        continue;
      }
      const coords = match[2];
      if (coords.length < 2) {
        this.pass();
        continue;
      }
      const col = letters.indexOf(coords[0]);
      const row = letters.indexOf(coords[1]);
      if (col < 0 || row < 0 || col >= this.size || row >= this.size) continue;
      this.play(row * this.size + col);
    }
  }
}
