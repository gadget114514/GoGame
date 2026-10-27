import type {
  CaptureEffect,
  DeadStoneStyle,
  PieceStyle,
  TrueEyeModel,
  WallModel
} from './Board3D';
import type { BoardColor } from './boardTheme';
import type { HeatmapTheme } from './heatmap';

export interface StylePreset {
  wallModel: WallModel;
  trueEyeModel: TrueEyeModel;
  falseEyeModels: boolean;
  boardColor: BoardColor;
  heatmapTheme: HeatmapTheme;
  deadStoneStyle: DeadStoneStyle;
  captureEffect: CaptureEffect;
}

export const STYLE_PRESETS: Record<PieceStyle, StylePreset> = {
  clayfoot: {
    wallModel: 'fence',
    trueEyeModel: 'trueeye',
    falseEyeModels: true,
    boardColor: 'wood',
    heatmapTheme: 'green-orange',
    deadStoneStyle: 'cube',
    captureEffect: 'shatter'
  },
  'dark-yagami': {
    wallModel: 'fence',
    trueEyeModel: 'trueeye',
    falseEyeModels: true,
    boardColor: 'gray',
    heatmapTheme: 'red-gray',
    deadStoneStyle: 'stone',
    captureEffect: 'dissolve'
  },
  'animal-bag': {
    wallModel: 'fence',
    trueEyeModel: 'cute',
    falseEyeModels: true,
    boardColor: 'green',
    heatmapTheme: 'gray-red',
    deadStoneStyle: 'cube',
    captureEffect: 'shatter'
  },
  'kenney-pets': {
    wallModel: 'fence',
    trueEyeModel: 'cute',
    falseEyeModels: true,
    boardColor: 'gray',
    heatmapTheme: 'blue-orange',
    deadStoneStyle: 'cube',
    captureEffect: 'height'
  },
  'quirky-animals': {
    wallModel: 'fence',
    trueEyeModel: 'trueeye',
    falseEyeModels: true,
    boardColor: 'green',
    heatmapTheme: 'gray-red',
    deadStoneStyle: 'cube',
    captureEffect: 'dissolve'
  },
  stones: {
    wallModel: 'seaweed',
    trueEyeModel: 'off',
    falseEyeModels: false,
    boardColor: 'wood',
    heatmapTheme: 'green-orange',
    deadStoneStyle: 'stone',
    captureEffect: 'height'
  }
};
