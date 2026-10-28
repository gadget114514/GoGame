export type BoardSize = 9 | 13 | 19;

export const BOARD_SIZES: readonly BoardSize[] = [9, 13, 19];

export const DEFAULT_KOMI: Record<BoardSize, number> = {
  9: 7,
  13: 7,
  19: 7.5
};

/** Star point line offsets (0-indexed) for each board size. */
const STAR_LINES: Record<BoardSize, number[]> = {
  9: [2, 4, 6],
  13: [3, 6, 9],
  19: [3, 9, 15]
};

export function isBoardSize(value: number): value is BoardSize {
  return value === 9 || value === 13 || value === 19;
}

export function starPoints(size: BoardSize): number[] {
  const lines = STAR_LINES[size];
  const points: number[] = [];
  for (const row of lines) {
    for (const col of lines) points.push(row * size + col);
  }
  return points;
}

export function neighbors(index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const result: number[] = [];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}

export const COORD_LETTERS = 'ABCDEFGHJKLMNOPQRST';

export type ColumnLabels = 'letters' | 'numbers' | 'none';
export type RowLabels = 'numbers' | 'none';
export type RowOrigin = 'top' | 'bottom';

export function columnLabel(col: number, mode: ColumnLabels): string | null {
  if (mode === 'none') return null;
  if (mode === 'letters') return COORD_LETTERS[col] ?? null;
  return String(col + 1);
}

export function rowLabel(
  row: number,
  mode: RowLabels,
  origin: RowOrigin = 'top',
  size = 19
): string | null {
  if (mode === 'none') return null;
  return String(origin === 'top' ? row + 1 : size - row);
}

export interface BoardCoordinateOptions {
  size: number;
  columns: ColumnLabels;
  rowOrigin: RowOrigin;
  perspective: 'black' | 'white';
}

/**
 * Formats a board intersection using the labels shown on the board. Column
 * labels may be letters (`A`, `B`, ...) or numbers; row numbers start at the
 * top or bottom depending on `rowOrigin`. The result matches what the player
 * sees on the board, including the rotated White perspective.
 */
export function formatBoardCoordinate(
  index: number | null,
  options: BoardCoordinateOptions
): string {
  const { size, columns, rowOrigin, perspective } = options;
  if (index === null || index < 0 || index >= size * size) return 'Pass';

  const rawCol = index % size;
  const rawRow = Math.floor(index / size);
  const col = perspective === 'white' ? size - 1 - rawCol : rawCol;
  const row = perspective === 'white' ? size - 1 - rawRow : rawRow;

  const colText =
    columns === 'letters'
      ? COORD_LETTERS[col] ?? '?'
      : String(col + 1);
  const rowText = String(rowOrigin === 'top' ? row + 1 : size - row);

  return columns === 'letters' ? `${colText}${rowText}` : `${colText},${rowText}`;
}

/**
 * Formats a 0-indexed board intersection to standard Go coordinate notation (e.g. "Q16", "D4").
 * Standard Go skips the letter 'I'. Row numbering counts from bottom (1) to top (size).
 */
export function formatCoordinate(index: number | null, size: number): string {
  if (index === null || index < 0 || index >= size * size) return 'Pass';
  const col = index % size;
  const row = Math.floor(index / size);
  const colLetter = COORD_LETTERS[col] ?? '?';
  const rowNumber = size - row;
  return `${colLetter}${rowNumber}`;
}

