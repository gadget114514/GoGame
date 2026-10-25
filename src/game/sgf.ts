import { BLACK, WHITE, type Goban, type Player } from './Goban';
import { isBoardSize, type BoardSize } from './BoardSize';

export interface SGFMove {
  color: Player;
  move: number | null;
  comment?: string;
}

export interface SGFGame {
  size: BoardSize;
  komi: number;
  blackPlayer: string;
  whitePlayer: string;
  result: string;
  date: string;
  rules: string;
  handicapStones: number[];
  moves: SGFMove[];
}

export interface SGFMetadata {
  blackPlayer?: string;
  whitePlayer?: string;
  result?: string;
  date?: string;
  rules?: string;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Converts a board intersection index (row * size + col) to SGF 2-letter coordinate (e.g. "pd").
 */
export function indexToSGFCoord(index: number | null, size: number): string {
  if (index === null || index < 0 || index >= size * size) return '';
  const col = index % size;
  const row = Math.floor(index / size);
  if (col >= LETTERS.length || row >= LETTERS.length) return '';
  return `${LETTERS[col]}${LETTERS[row]}`;
}

/**
 * Converts SGF 2-letter coordinate to board index (row * size + col).
 */
export function sgfCoordToIndex(coord: string, size: number): number | null {
  if (!coord || coord.length < 2) return null;
  const trimmed = coord.trim().toLowerCase();
  if (trimmed.length < 2) return null;
  // Some Go systems (like KGS/IGS on 19x19) use "tt" for pass
  if (trimmed === 'tt' && size <= 19) return null;

  const col = LETTERS.indexOf(trimmed[0]);
  const row = LETTERS.indexOf(trimmed[1]);
  if (col < 0 || col >= size || row < 0 || row >= size) return null;
  return row * size + col;
}

/**
 * Parses an SGF string into an SGFGame object.
 */
export function parseSGF(sgfText: string): SGFGame {
  const clean = sgfText.trim();

  // Parse Size
  let size: BoardSize = 19;
  const sizeMatch = clean.match(/SZ\[(\d+)\]/i);
  if (sizeMatch) {
    const parsed = Number(sizeMatch[1]);
    if (isBoardSize(parsed)) size = parsed;
  }

  // Parse Komi
  let komi = 7.5;
  const komiMatch = clean.match(/KM\[([\d.-]+)\]/i);
  if (komiMatch) {
    const parsed = Number(komiMatch[1]);
    if (Number.isFinite(parsed)) komi = parsed;
  }

  // Metadata
  const pbMatch = clean.match(/PB\[([^\]]*)\]/i);
  const pwMatch = clean.match(/PW\[([^\]]*)\]/i);
  const reMatch = clean.match(/RE\[([^\]]*)\]/i);
  const dtMatch = clean.match(/DT\[([^\]]*)\]/i);
  const ruMatch = clean.match(/RU\[([^\]]*)\]/i);

  const blackPlayer = pbMatch ? pbMatch[1].trim() : 'Black';
  const whitePlayer = pwMatch ? pwMatch[1].trim() : 'White';
  const result = reMatch ? reMatch[1].trim() : '';
  const date = dtMatch ? dtMatch[1].trim() : '';
  const rules = ruMatch ? ruMatch[1].trim() : 'Chinese';

  // Handicap stones: AB[dp][pd]...
  const handicapStones: number[] = [];
  const abRegex = /AB((?:\[[a-z]{2}\])+)/gi;
  let abMatch: RegExpExecArray | null;
  while ((abMatch = abRegex.exec(clean)) !== null) {
    const coordsBlock = abMatch[1];
    const coordRegex = /\[([a-z]{2})\]/gi;
    let cMatch: RegExpExecArray | null;
    while ((cMatch = coordRegex.exec(coordsBlock)) !== null) {
      const idx = sgfCoordToIndex(cMatch[1], size);
      if (idx !== null && !handicapStones.includes(idx)) {
        handicapStones.push(idx);
      }
    }
  }

  // Parse Moves: ;B[pd] or ;W[] with optional comments C[...]
  const moves: SGFMove[] = [];
  const nodeRegex = /;\s*([BW])\s*\[([a-z]{0,2})\](?:\s*C\[([^\]]*)\])?/gi;
  let moveMatch: RegExpExecArray | null;

  while ((moveMatch = nodeRegex.exec(clean)) !== null) {
    const colorChar = moveMatch[1].toUpperCase();
    const color: Player = colorChar === 'B' ? BLACK : WHITE;
    const coord = moveMatch[2];
    const comment = moveMatch[3] ? moveMatch[3].trim() : undefined;

    const move = sgfCoordToIndex(coord, size);
    moves.push({ color, move, comment });
  }

  return {
    size,
    komi,
    blackPlayer,
    whitePlayer,
    result,
    date,
    rules,
    handicapStones,
    moves
  };
}

export function escapeSGFText(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
}

/**
 * Generates an SGF string from a Goban state and optional metadata.
 */
export function generateSGF(goban: Goban, metadata: SGFMetadata = {}): string {
  const dateStr = escapeSGFText(metadata.date || new Date().toISOString().split('T')[0]);
  const pb = escapeSGFText(metadata.blackPlayer || 'Human (Black)');
  const pw = escapeSGFText(metadata.whitePlayer || 'KataGo AI (White)');
  const ru = escapeSGFText(metadata.rules || 'Chinese');

  let header = `(;GM[1]FF[4]CA[UTF-8]AP[GoGame3D:1.0]SZ[${goban.size}]KM[${goban.komi}]RU[${ru}]PB[${pb}]PW[${pw}]DT[${dateStr}]`;
  if (metadata.result) {
    header += `RE[${escapeSGFText(metadata.result)}]`;
  }

  let body = '';
  for (const record of goban.moves) {
    const prefix = record.color === BLACK ? 'B' : 'W';
    const coord = indexToSGFCoord(record.move, goban.size);
    body += `;${prefix}[${coord}]`;
  }

  return `${header}${body})`;
}
