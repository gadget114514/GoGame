import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONFIG_KEY,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig
} from '../src/config';
import { DEFAULT_RANK_THRESHOLDS } from '../src/ui/pieceRank';

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
    expect(config.rules).toBe('chinese');
    expect(config.coordinateSystem).toBe('screen');
    expect(config.columnLabels).toBe('numbers');
    expect(config.rowLabels).toBe('numbers');
    expect(config.cameraProjection).toBe('orthographic');
    expect(config.komi).toBe(7);
    expect(config.hoverPreview).toBe(true);
    expect(config.pieceStyle).toBe('kenney-pets');
    expect(config.rankThresholds[19]).toEqual(DEFAULT_RANK_THRESHOLDS[19]);
    expect(config.heatmapTheme).toBe('green-orange');
    expect(config.captureEffect).toBe('shatter');
    expect(config.fenceModel).toBe('dark');
    expect(config.boardColor).toBe('wood');
    expect(config.animations).toBe(true);
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
      rules: 'chinese',
      coordinateSystem: 'standard',
      columnLabels: 'letters',
      rowLabels: 'numbers',
      hoverPreview: false,
      cameraProjection: 'perspective',
      komi: 7.5,
      pieceStyle: 'animal-bag',
      rankThresholds: {
        ...DEFAULT_CONFIG.rankThresholds,
        13: [0.8, 0.7, 0.6, 0.5, 0.4]
      },
      boardColor: 'green',
      captureEffect: 'dissolve',
      fenceModel: 'light',
      wallModel: 'seaweed',
      trueEyeModel: 'cute',
      falseEyeModels: false
    });

    const config = loadConfig();

    expect(config.boardSize).toBe(13);
    expect(config.coordinateSystem).toBe('standard');
    expect(config.columnLabels).toBe('letters');
    expect(config.rowLabels).toBe('numbers');
    expect(config.hoverPreview).toBe(false);
    expect(config.komi).toBe(7.5);
    expect(config.pieceStyle).toBe('animal-bag');
    expect(config.rankThresholds[13]).toEqual([0.8, 0.7, 0.6, 0.5, 0.4]);
    expect(config.boardColor).toBe('green');
    expect(config.captureEffect).toBe('dissolve');
    expect(config.cameraProjection).toBe('perspective');
    expect(config.fenceModel).toBe('light');
    expect(config.wallModel).toBe('seaweed');
    expect(config.trueEyeModel).toBe('cute');
    expect(config.falseEyeModels).toBe(false);
  });

  it('falls back to defaults for contradictory rank thresholds', () => {
    const storage = makeStorage();
    vi.stubGlobal('localStorage', storage);

    storage.setItem(
      CONFIG_KEY,
      JSON.stringify({
        ...DEFAULT_CONFIG,
        rankThresholds: {
          9: [0.8, 0.7, 0.6, 0.5, 0.4],
          13: [0.8, 0.7, 0.6, 0.5, 0.4],
          19: [0.4, 0.5, 0.6, 0.7, 0.8]
        }
      })
    );

    const config = loadConfig();

    expect(config.rankThresholds[9]).toEqual([0.8, 0.7, 0.6, 0.5, 0.4]);
    expect(config.rankThresholds[19]).toEqual(DEFAULT_RANK_THRESHOLDS[19]);
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
