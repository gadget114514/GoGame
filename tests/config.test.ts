import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONFIG_KEY,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig
} from '../src/config';

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    }
  } as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('game config', () => {
  it('uses the new defaults and writes a config key', () => {
    const storage = makeStorage();
    vi.stubGlobal('localStorage', storage);

    const config = loadConfig();

    expect(config.boardSize).toBe(9);
    expect(config.komi).toBe(7);
    expect(config.pieceStyle).toBe('quirky-animals');
    expect(config.wallModel).toBe('fence');
    expect(config.trueEyeModel).toBe('trueeye');
    expect(config.falseEyeModels).toBe(true);
    expect(storage.data.has(CONFIG_KEY)).toBe(true);
  });

  it('round-trips settings through the config key', () => {
    const storage = makeStorage();
    vi.stubGlobal('localStorage', storage);

    saveConfig({
      ...DEFAULT_CONFIG,
      boardSize: 13,
      komi: 7.5,
      pieceStyle: 'animal-bag',
      wallModel: 'seaweed',
      trueEyeModel: 'cute',
      falseEyeModels: false
    });

    const config = loadConfig();

    expect(config.boardSize).toBe(13);
    expect(config.komi).toBe(7.5);
    expect(config.pieceStyle).toBe('animal-bag');
    expect(config.wallModel).toBe('seaweed');
    expect(config.trueEyeModel).toBe('cute');
    expect(config.falseEyeModels).toBe(false);
  });

  it('migrates legacy settings when no config exists', () => {
    const storage = makeStorage({
      'gogame:boardSize': '19',
      'gogame:komi': '6.5',
      'gogame:pieceStyle': 'dark-yagami',
      'gogame:aiLevel': 'manual',
      'gogame:wallModel': 'off',
      'gogame:trueEyeModels': 'false'
    });
    vi.stubGlobal('localStorage', storage);

    const config = loadConfig();

    expect(config.boardSize).toBe(19);
    expect(config.komi).toBe(6.5);
    expect(config.pieceStyle).toBe('dark-yagami');
    expect(config.opponent).toBe('manual');
    expect(config.wallModel).toBe('off');
    expect(config.trueEyeModel).toBe('off');
  });
});
