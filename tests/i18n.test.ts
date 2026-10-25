import { describe, expect, it } from 'vitest';
import { getLanguage, setLanguage, t, detectInitialLanguage } from '../src/i18n';

describe('i18n localization', () => {
  it('translates English, Japanese, and Spanish', () => {
    setLanguage('en');
    expect(t('newGame')).toBe('New');
    expect(t('black')).toBe('Black');
    expect(t('turnToPlay', { side: 'Black', move: 5 })).toBe('Black to play · move 5');

    setLanguage('ja');
    expect(t('newGame')).toBe('対局開始');
    expect(t('black')).toBe('黒');
    expect(t('turnToPlay', { side: '黒', move: 5 })).toBe('黒の手番 · 5手目');

    setLanguage('es');
    expect(t('newGame')).toBe('Nueva');
    expect(t('black')).toBe('Negras');
    expect(t('turnToPlay', { side: 'Negras', move: 5 })).toBe('Negras para jugar · jugada 5');
  });

  it('detects language fallback correctly', () => {
    expect(['en', 'ja', 'es']).toContain(detectInitialLanguage());
  });
});
