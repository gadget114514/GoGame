/** Convert an ownership value in [-1, 1] (positive = Black) to an RGBA color. */
export function heatColor(value: number): [number, number, number, number] {
  const t = Math.max(-1, Math.min(1, value));
  const strength = Math.abs(t);
  const alpha = 0.12 + 0.58 * strength;
  if (t >= 0) {
    // Black influence: warm ember.
    const r = 224 - 40 * (1 - strength);
    const g = 96 + 40 * strength;
    const b = 48;
    return [r, g, b, alpha];
  }
  // White influence: cool water.
  const r = 56;
  const g = 128 + 40 * strength;
  const b = 220;
  return [r, g, b, alpha];
}

export function scoreTint(scoreLead: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, scoreLead / 30));
  if (t >= 0) return [0.42 + 0.12 * t, 0.29, 0.18];
  return [0.24, 0.25, 0.34 + 0.18 * -t];
}
