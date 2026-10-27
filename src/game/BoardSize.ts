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

export function columnLabel(col: number, mode: ColumnLabels): string | null {
  if (mode === 'none') return null;
  if (mode === 'letters') return COORD_LETTERS[col] ?? null;
  return String(col + 1);
}

export function rowLabel(row: number, mode: RowLabels): string | null {
  return mode === 'none' ? null : String(row + 1);
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

