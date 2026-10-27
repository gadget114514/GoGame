import { describe, expect, it } from 'vitest';
import { heatColor, isHeatmapTheme } from '../src/ui/heatmap';

describe('heatmap colors', () => {
  it('defaults to green for Black and orange for White', () => {
    const [blackR, blackG, blackB] = heatColor(1);
    const [whiteR, whiteG, whiteB] = heatColor(-1);

    expect(blackG).toBeGreaterThan(blackR);
    expect(blackG).toBeGreaterThan(blackB);
    expect(whiteR).toBeGreaterThan(whiteG);
    expect(whiteG).toBeGreaterThan(whiteB);
  });

  it('supports swapped and alternate themes', () => {
    const [orangeR, orangeG] = heatColor(1, 'orange-green');
    const [blueR, blueG, blueB] = heatColor(1, 'blue-orange');
    const [whiteOrangeR, whiteOrangeG] = heatColor(-1, 'blue-orange');

    expect(orangeR).toBeGreaterThan(orangeG);
    expect(blueB).toBeGreaterThan(blueR);
    expect(blueB).toBeGreaterThan(blueG);
    expect(whiteOrangeR).toBeGreaterThan(whiteOrangeG);
  });

  it('validates theme names', () => {
    expect(isHeatmapTheme('green-orange')).toBe(true);
    expect(isHeatmapTheme('orange-green')).toBe(true);
    expect(isHeatmapTheme('purple')).toBe(false);
  });
});
