import { describe, expect, it } from 'vitest';
import { calculateLeadBound, type EvalPoint } from '../src/ui/EvalGraph';
import { setLanguage, t } from '../src/i18n';

describe('EvalGraph evaluation bounds and formatting', () => {
  it('calculates minimum lead bound of 15 for empty or small leads', () => {
    expect(calculateLeadBound([])).toBe(15);

    const smallPoints: EvalPoint[] = [
      { moveNum: 0, winrate: 0.5, scoreLead: 0.5 },
      { moveNum: 1, winrate: 0.52, scoreLead: -1.2 },
      { moveNum: 2, winrate: 0.58, scoreLead: 3.5 }
    ];
    expect(calculateLeadBound(smallPoints)).toBe(15);
  });

  it('scales lead bounds upwards in multiples of 5 and clamps at 60', () => {
    const mediumPoints: EvalPoint[] = [
      { moveNum: 0, winrate: 0.5, scoreLead: 0 },
      { moveNum: 1, winrate: 0.8, scoreLead: 18.4 }
    ];
    // 18.4 + 2 = 20.4 -> ceil(20.4/5)*5 = 25
    expect(calculateLeadBound(mediumPoints)).toBe(25);

    const largePoints: EvalPoint[] = [
      { moveNum: 0, winrate: 0.1, scoreLead: -42.0 }
    ];
    // 42 + 2 = 44 -> ceil(44/5)*5 = 45
    expect(calculateLeadBound(largePoints)).toBe(45);

    const extremePoints: EvalPoint[] = [
      { moveNum: 0, winrate: 0.99, scoreLead: 95.0 }
    ];
    // Clamped at 60
    expect(calculateLeadBound(extremePoints)).toBe(60);
  });

  it('has valid translations for eval graph in all supported languages', () => {
    for (const lang of ['en', 'ja', 'es'] as const) {
      setLanguage(lang);
      expect(t('evalGraph')).toBeTruthy();
      expect(t('evalGraphTitle')).toBeTruthy();
      expect(t('evalGraphModeWinrate')).toBeTruthy();
      expect(t('evalGraphModeLead')).toBeTruthy();
      expect(t('evalGraphEven')).toBeTruthy();
      expect(t('blackWinShort')).toBeTruthy();
      expect(t('whiteWinShort')).toBeTruthy();

      const tooltip = t('evalGraphTooltip', {
        move: 10,
        rate: '65.0',
        side: t('blackWinShort'),
        lead: '+3.5'
      });
      expect(tooltip).toContain('10');
      expect(tooltip).toContain('65.0');
    }
  });
});
