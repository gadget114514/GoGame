export type BoardColor = 'wood' | 'green' | 'gray';

export const BOARD_COLORS: readonly BoardColor[] = ['wood', 'green', 'gray'];

export interface BoardPalette {
  surface: string;
  rim: string;
  grid: string;
  star: string;
  coord: string;
  coordActive: string;
}

const BOARD_PALETTES: Record<BoardColor, BoardPalette> = {
  wood: {
    surface: '#c99755',
    rim: '#8a5e2f',
    grid: '#3c2612',
    star: '#32200f',
    coord: '#221408',
    coordActive: '#d97706'
  },
  green: {
    surface: '#5f8f63',
    rim: '#3d5f41',
    grid: '#1d3a24',
    star: '#17301d',
    coord: '#142711',
    coordActive: '#ffd166'
  },
  gray: {
    surface: '#74797f',
    rim: '#53575c',
    grid: '#2b2e33',
    star: '#23262a',
    coord: '#191c20',
    coordActive: '#ff9f1c'
  }
};

export function isBoardColor(value: unknown): value is BoardColor {
  return typeof value === 'string' && BOARD_COLORS.includes(value as BoardColor);
}

export function boardPalette(color: BoardColor): BoardPalette {
  return BOARD_PALETTES[color];
}
