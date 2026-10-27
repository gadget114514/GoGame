export type HeatmapTheme =
  | 'green-orange'
  | 'orange-green'
  | 'blue-orange'
  | 'orange-blue';

export const HEATMAP_THEMES: readonly HeatmapTheme[] = [
  'green-orange',
  'orange-green',
  'blue-orange',
  'orange-blue'
];

const HEATMAP_PALETTES: Record<
  HeatmapTheme,
  { black: [number, number, number]; white: [number, number, number] }
> = {
  'green-orange': { black: [56, 198, 118], white: [245, 150, 50] },
  'orange-green': { black: [245, 150, 50], white: [56, 198, 118] },
  'blue-orange': { black: [56, 132, 220], white: [245, 150, 50] },
  'orange-blue': { black: [245, 150, 50], white: [56, 132, 220] }
};

export function isHeatmapTheme(value: unknown): value is HeatmapTheme {
  return typeof value === 'string' && HEATMAP_THEMES.includes(value as HeatmapTheme);
}

/** Convert an ownership value in [-1, 1] (positive = Black) to an RGBA color. */
export function heatColor(
  value: number,
  theme: HeatmapTheme = 'green-orange'
): [number, number, number, number] {
  const t = Math.max(-1, Math.min(1, value));
  const strength = Math.abs(t);
  const alpha = 0.12 + 0.58 * strength;
  const palette = HEATMAP_PALETTES[theme];
  const [r, g, b] = t >= 0 ? palette.black : palette.white;
  const shade = 0.7 + 0.3 * strength;
  return [r * shade, g * shade, b * shade, alpha];
}

export function scoreTint(scoreLead: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, scoreLead / 30));
  if (t >= 0) return [0.42 + 0.12 * t, 0.29, 0.18];
  return [0.24, 0.25, 0.34 + 0.18 * -t];
}
