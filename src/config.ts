import {
  BOARD_SIZES,
  DEFAULT_KOMI,
  isBoardSize,
  type BoardSize,
  type ColumnLabels,
  type RowLabels
} from './game/BoardSize';
import { detectInitialLanguage, type Language } from './i18n';
import {
  defaultThresholds,
  isValidRankThresholds,
  type RankThresholds
} from './ui/pieceRank';
import { isHeatmapTheme, type HeatmapTheme } from './ui/heatmap';
import { isBoardColor, type BoardColor } from './ui/boardTheme';
import { isFenceModel, type FenceModel } from './ui/fenceModels';
import type {
  CameraProjection,
  CaptureEffect,
  DeadStoneStyle,
  PieceStyle,
  TrueEyeModel,
  WallModel
} from './ui/Board3D';

export type OpponentMode = 'dan' | 'kyu' | 'manual';
export type Rules = 'chinese';
export type ViewMode = '3d' | '2d';

export interface GameConfig {
  version: 1;
  boardSize: BoardSize;
  rules: Rules;
  columnLabels: ColumnLabels;
  rowLabels: RowLabels;
  komi: number;
  opponent: OpponentMode;
  playerSide: 'black' | 'white';
  pieceStyle: PieceStyle;
  rankThresholds: Record<BoardSize, RankThresholds>;
  deadStoneStyle: DeadStoneStyle;
  captureEffect: CaptureEffect;
  boardColor: BoardColor;
  language: Language;
  view: ViewMode;
  hoverEval: boolean;
  hoverPreview: boolean;
  heatmap: boolean;
  heatmapTheme: HeatmapTheme;
  animations: boolean;
  evalGraph: boolean;
  twoEyeHighlight: boolean;
  cameraProjection: CameraProjection;
  wallModel: WallModel;
  fenceModel: FenceModel;
  trueEyeModel: TrueEyeModel;
  falseEyeModels: boolean;
  replaySpeed: number;
}

export const CONFIG_KEY = 'gogame:config';

export const DEFAULT_CONFIG: GameConfig = {
  version: 1,
  boardSize: 9,
  rules: 'chinese',
  columnLabels: 'letters',
  rowLabels: 'numbers',
  komi: DEFAULT_KOMI[9],
  opponent: 'dan',
  playerSide: 'black',
  pieceStyle: 'kenney-pets',
  rankThresholds: {
    9: defaultThresholds(9),
    13: defaultThresholds(13),
    19: defaultThresholds(19)
  },
  deadStoneStyle: 'cube',
  captureEffect: 'shatter',
  boardColor: 'wood',
  language: 'en',
  view: '3d',
  hoverEval: true,
  hoverPreview: true,
  heatmap: true,
  heatmapTheme: 'green-orange',
  animations: true,
  evalGraph: true,
  twoEyeHighlight: true,
  cameraProjection: 'orthographic',
  wallModel: 'fence',
  fenceModel: 'dark',
  trueEyeModel: 'trueeye',
  falseEyeModels: true,
  replaySpeed: 1000
};

const PIECE_STYLES = new Set<PieceStyle>([
  'clayfoot',
  'dark-yagami',
  'animal-bag',
  'kenney-pets',
  'quirky-animals',
  'stones'
]);
const DEAD_STONE_STYLES = new Set<DeadStoneStyle>(['cube', 'stone']);
const CAPTURE_EFFECTS = new Set<CaptureEffect>(['shatter', 'dissolve', 'height']);
const WALL_MODELS = new Set<WallModel>(['off', 'seaweed', 'fence']);
const TRUE_EYE_MODELS = new Set<TrueEyeModel>(['off', 'cute', 'trueeye']);
const LANGUAGES = new Set<Language>(['en', 'ja', 'es']);
const OPPONENTS = new Set<OpponentMode>(['dan', 'kyu', 'manual']);
const RULES = new Set<Rules>(['chinese']);
const COLUMN_LABELS = new Set<ColumnLabels>(['letters', 'numbers', 'none']);
const ROW_LABELS = new Set<RowLabels>(['numbers', 'none']);
const CAMERA_PROJECTIONS = new Set<CameraProjection>(['perspective', 'orthographic']);
const SIDES = new Set<'black' | 'white'>(['black', 'white']);
const VIEWS = new Set<ViewMode>(['3d', '2d']);
const REPLAY_SPEEDS = new Set([500, 1000, 1500]);

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function number(value: unknown, fallback: number, min = -Infinity): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min
    ? value
    : fallback;
}

function sanitizeRankThresholds(
  raw: unknown
): Record<BoardSize, RankThresholds> {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const thresholds = {} as Record<BoardSize, RankThresholds>;
  for (const size of BOARD_SIZES) {
    const candidate = source[String(size)];
    thresholds[size] = isValidRankThresholds(candidate)
      ? ([...candidate] as RankThresholds)
      : defaultThresholds(size);
  }
  return thresholds;
}

function sanitize(raw: unknown): GameConfig {
  const config: GameConfig = { ...DEFAULT_CONFIG };
  if (!raw || typeof raw !== 'object') return config;
  const value = raw as Record<string, unknown>;

  const size = number(value.boardSize, config.boardSize);
  if (isBoardSize(size)) config.boardSize = size;
  if (RULES.has(value.rules as Rules)) config.rules = value.rules as Rules;
  if (COLUMN_LABELS.has(value.columnLabels as ColumnLabels)) {
    config.columnLabels = value.columnLabels as ColumnLabels;
  }
  if (ROW_LABELS.has(value.rowLabels as RowLabels)) {
    config.rowLabels = value.rowLabels as RowLabels;
  }
  config.komi = number(value.komi, config.komi, 0);
  if (OPPONENTS.has(value.opponent as OpponentMode)) {
    config.opponent = value.opponent as OpponentMode;
  }
  if (SIDES.has(value.playerSide as 'black' | 'white')) {
    config.playerSide = value.playerSide as 'black' | 'white';
  }
  if (PIECE_STYLES.has(value.pieceStyle as PieceStyle)) {
    config.pieceStyle = value.pieceStyle as PieceStyle;
  }
  config.rankThresholds = sanitizeRankThresholds(value.rankThresholds);
  if (DEAD_STONE_STYLES.has(value.deadStoneStyle as DeadStoneStyle)) {
    config.deadStoneStyle = value.deadStoneStyle as DeadStoneStyle;
  }
  if (CAPTURE_EFFECTS.has(value.captureEffect as CaptureEffect)) {
    config.captureEffect = value.captureEffect as CaptureEffect;
  }
  if (isBoardColor(value.boardColor)) {
    config.boardColor = value.boardColor;
  }
  if (LANGUAGES.has(value.language as Language)) {
    config.language = value.language as Language;
  }
  if (VIEWS.has(value.view as ViewMode)) config.view = value.view as ViewMode;
  if (WALL_MODELS.has(value.wallModel as WallModel)) {
    config.wallModel = value.wallModel as WallModel;
  }
  if (CAMERA_PROJECTIONS.has(value.cameraProjection as CameraProjection)) {
    config.cameraProjection = value.cameraProjection as CameraProjection;
  }
  if (isFenceModel(value.fenceModel)) {
    config.fenceModel = value.fenceModel;
  }
  if (TRUE_EYE_MODELS.has(value.trueEyeModel as TrueEyeModel)) {
    config.trueEyeModel = value.trueEyeModel as TrueEyeModel;
  }

  config.hoverEval = bool(value.hoverEval, config.hoverEval);
  config.hoverPreview = bool(value.hoverPreview, config.hoverPreview);
  config.heatmap = bool(value.heatmap, config.heatmap);
  if (isHeatmapTheme(value.heatmapTheme)) config.heatmapTheme = value.heatmapTheme;
  config.animations = bool(value.animations, config.animations);
  config.evalGraph = bool(value.evalGraph, config.evalGraph);
  config.twoEyeHighlight = bool(value.twoEyeHighlight, config.twoEyeHighlight);
  config.falseEyeModels = bool(value.falseEyeModels, config.falseEyeModels);
  const replaySpeed = number(value.replaySpeed, config.replaySpeed, 100);
  config.replaySpeed = REPLAY_SPEEDS.has(replaySpeed) ? replaySpeed : config.replaySpeed;
  return config;
}

function readLegacy(): Partial<GameConfig> {
  const storage = getStorage();
  if (!storage) return {};
  const legacy: Partial<GameConfig> = {};

  const boardSize = Number(storage.getItem('gogame:boardSize'));
  if (isBoardSize(boardSize)) legacy.boardSize = boardSize;
  const komiRaw = storage.getItem('gogame:komi');
  if (komiRaw !== null) {
    const komi = Number(komiRaw);
    if (Number.isFinite(komi) && komi >= 0) legacy.komi = komi;
  }

  const rules = storage.getItem('gogame:rules') as Rules | null;
  if (rules && RULES.has(rules)) legacy.rules = rules;
  const opponent = storage.getItem('gogame:aiLevel') as OpponentMode | null;
  if (opponent && OPPONENTS.has(opponent)) legacy.opponent = opponent;
  const side = storage.getItem('gogame:playerSide') as 'black' | 'white' | null;
  if (side && SIDES.has(side)) legacy.playerSide = side;
  const pieceStyle = storage.getItem('gogame:pieceStyle') as PieceStyle | null;
  if (pieceStyle && PIECE_STYLES.has(pieceStyle)) legacy.pieceStyle = pieceStyle;
  const deadStyle = storage.getItem('gogame:deadStoneStyle') as DeadStoneStyle | null;
  if (deadStyle && DEAD_STONE_STYLES.has(deadStyle)) legacy.deadStoneStyle = deadStyle;
  const captureEffect = storage.getItem('gogame:captureEffect') as CaptureEffect | null;
  if (captureEffect && CAPTURE_EFFECTS.has(captureEffect)) legacy.captureEffect = captureEffect;
  const boardColor = storage.getItem('gogame:boardColor');
  if (isBoardColor(boardColor)) legacy.boardColor = boardColor;
  const language = storage.getItem('gogame:language') as Language | null;
  if (language && LANGUAGES.has(language)) legacy.language = language;
  const view = storage.getItem('gogame:view') as ViewMode | null;
  if (view && VIEWS.has(view)) legacy.view = view;

  const wallModel = storage.getItem('gogame:wallModel') as WallModel | null;
  if (wallModel && WALL_MODELS.has(wallModel)) legacy.wallModel = wallModel;
  const cameraProjection = storage.getItem(
    'gogame:cameraProjection'
  ) as CameraProjection | null;
  if (cameraProjection && CAMERA_PROJECTIONS.has(cameraProjection)) {
    legacy.cameraProjection = cameraProjection;
  }
  const fenceModel = storage.getItem('gogame:fenceModel');
  if (isFenceModel(fenceModel)) legacy.fenceModel = fenceModel;
  const trueEyeModel = storage.getItem('gogame:trueEyeModel') as TrueEyeModel | null;
  if (trueEyeModel && TRUE_EYE_MODELS.has(trueEyeModel)) {
    legacy.trueEyeModel = trueEyeModel;
  } else if (storage.getItem('gogame:trueEyeModels') === 'false') {
    legacy.trueEyeModel = 'off';
  }

  const hoverEval = storage.getItem('gogame:hoverEval');
  if (hoverEval !== null) legacy.hoverEval = hoverEval !== 'false';
  const heatmap = storage.getItem('gogame:heatmap');
  if (heatmap !== null) legacy.heatmap = heatmap !== 'false';
  const heatmapTheme = storage.getItem('gogame:heatmapTheme');
  if (heatmapTheme && isHeatmapTheme(heatmapTheme)) legacy.heatmapTheme = heatmapTheme;
  const animations = storage.getItem('gogame:animations');
  if (animations !== null) legacy.animations = animations !== 'false';
  const evalGraph = storage.getItem('gogame:evalGraph');
  if (evalGraph !== null) legacy.evalGraph = evalGraph !== 'false';
  const eyeHighlight = storage.getItem('gogame:eyeHighlight');
  if (eyeHighlight !== null) legacy.twoEyeHighlight = eyeHighlight !== 'false';

  return legacy;
}

export function loadConfig(): GameConfig {
  const storage = getStorage();
  let config: GameConfig = {
    ...DEFAULT_CONFIG,
    language: detectInitialLanguage()
  };

  if (storage) {
    const raw = storage.getItem(CONFIG_KEY);
    if (raw) {
      try {
        config = sanitize(JSON.parse(raw));
      } catch {
        config = sanitize(null);
      }
    } else {
      config = sanitize({ ...config, ...readLegacy() });
    }
    saveConfig(config);
  }

  return config;
}

export function saveConfig(config: GameConfig): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Settings persistence is best-effort.
  }
}
