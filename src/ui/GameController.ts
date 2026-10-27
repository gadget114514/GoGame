import { Goban, BLACK, WHITE, type MoveRecord } from '../game/Goban';
import { DEFAULT_KOMI, formatCoordinate, isBoardSize, type BoardSize } from '../game/BoardSize';
import { KataGoEngine, type Evaluation } from '../ai/KataGoEngine';
import type { AILevel } from '../ai/registry';
import {
  Board3D,
  type CameraProjection,
  type CaptureEffect,
  type DeadStoneStyle,
  type PieceStyle,
  type RenderState,
  type TrueEyeModel,
  type WallModel
} from './Board3D';
import { Board2D } from './Board2D';
import { getLanguage, setLanguage, t, type Language } from '../i18n';
import {
  loadConfig,
  saveConfig,
  type GameConfig,
  type OpponentMode,
  type Rules,
  type ViewMode
} from '../config';
import { generateSGF, parseSGF } from '../game/sgf';
import { EvalGraph, type EvalPoint } from './EvalGraph';
import {
  defaultThresholds,
  rankLegendRanges,
  type RankThresholds
} from './pieceRank';
import { PIECE_STYLE_LEGEND_NAMES, type LegendRank } from './pieceLabels';
import { isHeatmapTheme, type HeatmapTheme } from './heatmap';
import { isBoardColor, type BoardColor } from './boardTheme';
import { isFenceModel, type FenceModel } from './fenceModels';
import { STYLE_PRESETS } from './stylePresets';
import thirdpartyText from '../../thirdparty.txt?raw';

interface Elements {
  canvas3d: HTMLCanvasElement;
  canvas2d: HTMLCanvasElement;
  boardSize: HTMLSelectElement;
  rules: HTMLSelectElement;
  cameraProjection: HTMLSelectElement;
  aiLevel: HTMLSelectElement;
  playerSide: HTMLSelectElement;
  pieceStyle: HTMLSelectElement;
  thresholds: HTMLInputElement[];
  thresholdSize: HTMLElement;
  thresholdError: HTMLElement;
  resetThresholds: HTMLButtonElement;
  deadStoneStyle: HTMLSelectElement;
  captureEffect: HTMLSelectElement;
  boardColor: HTMLSelectElement;
  languageSelect: HTMLSelectElement;
  toggleHoverEval: HTMLInputElement;
  toggleHeatmap: HTMLInputElement;
  heatmapTheme: HTMLSelectElement;
  toggleAnimations: HTMLInputElement;
  toggleEvalGraph: HTMLInputElement;
  toggleEyeHighlight: HTMLInputElement;
  wallModel: HTMLSelectElement;
  fenceModel: HTMLSelectElement;
  trueEyeModel: HTMLSelectElement;
  toggleFalseEyeModels: HTMLInputElement;
  komi: HTMLInputElement;
  newGame: HTMLButtonElement;
  pass: HTMLButtonElement;
  undo: HTMLButtonElement;
  evaluate: HTMLButtonElement;
  view: HTMLButtonElement;
  save: HTMLButtonElement;
  load: HTMLButtonElement;
  file: HTMLInputElement;
  settings: HTMLButtonElement;
  settingsModal: HTMLElement;
  settingsClose: HTMLButtonElement;
  credits: HTMLButtonElement;
  creditsModal: HTMLElement;
  creditsContent: HTMLElement;
  creditsClose: HTMLButtonElement;
  thinking: HTMLElement;
  boot: HTMLElement;
  turn: HTMLElement;
  score: HTMLElement;

  btnFirst: HTMLButtonElement;
  btnPrev: HTMLButtonElement;
  btnPlay: HTMLButtonElement;
  btnNext: HTMLButtonElement;
  btnLast: HTMLButtonElement;
  replaySlider: HTMLInputElement;
  replayCounter: HTMLElement;
  replaySpeed: HTMLSelectElement;

  evalGraphPanel: HTMLElement;
  evalGraphInfo: HTMLElement;
  btnGraphMode: HTMLButtonElement;
  btnCloseGraph: HTMLButtonElement;
  evalGraphCanvas: HTMLCanvasElement;
}

interface HistorySnapshot {
  board: Uint8Array;
  side: typeof BLACK | typeof WHITE;
  ko: number;
  lastMove: number | null;
  moves: MoveRecord[];
  moveRecord: MoveRecord | null;
  comment?: string;
  evalPoint?: EvalPoint | null;
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export class GameController {
  private readonly engine = new KataGoEngine();
  private readonly board3d: Board3D;
  private readonly board2d: Board2D;
  private readonly evalGraph: EvalGraph;
  private readonly els: Elements;

  private config: GameConfig;
  private goban: Goban;
  private opponent: OpponentMode = 'dan';
  private rules: Rules = 'chinese';
  private cameraProjection: CameraProjection = 'orthographic';
  private playerSide: 'black' | 'white' = 'black';
  private pieceStyle: PieceStyle = 'kenney-pets';
  private rankThresholds: Record<BoardSize, RankThresholds> = {
    9: defaultThresholds(9),
    13: defaultThresholds(13),
    19: defaultThresholds(19)
  };
  private deadStoneStyle: DeadStoneStyle = 'cube';
  private captureEffect: CaptureEffect = 'shatter';
  private boardColor: BoardColor = 'wood';
  private view: ViewMode = '3d';
  private evaluation: Evaluation | null = null;
  private busy = false;
  private gameOver = false;
  private evaluationToken = 0;

  private get level(): AILevel {
    return this.opponent === 'kyu' ? 'kyu' : 'dan';
  }

  private isManualMode(): boolean {
    return this.opponent === 'manual';
  }

  private hoverEvalEnabled = true;
  private heatmapEnabled = true;
  private heatmapTheme: HeatmapTheme = 'green-orange';
  private animationsEnabled = true;
  private eyeHighlightEnabled = true;
  private wallModel: WallModel = 'fence';
  private fenceModel: FenceModel = 'dark';
  private trueEyeModel: TrueEyeModel = 'trueeye';
  private falseEyeModelsEnabled = true;
  private hoverIndex: number | null = null;
  private hoverEvaluation: Evaluation | null = null;
  private hoverToken = 0;
  private hoverCache = new Map<string, Evaluation>();

  private evalGraphEnabled = true;
  private bgEvalTimer: number | null = null;
  private bgEvalActive = false;

  private history: HistorySnapshot[] = [];
  private currentHistoryIndex = 0;
  private isPlayingReplay = false;
  private replayTimer: number | null = null;
  private replaySpeed = 1000;

  constructor() {
    this.els = {
      canvas3d: requireElement('scene3d'),
      canvas2d: requireElement('scene2d'),
      boardSize: requireElement('board-size'),
      rules: requireElement('rules'),
      cameraProjection: requireElement('camera-projection'),
      aiLevel: requireElement('ai-level'),
      playerSide: requireElement('player-side'),
      pieceStyle: requireElement('piece-style'),
      thresholds: [
        requireElement('threshold-king'),
        requireElement('threshold-queen'),
        requireElement('threshold-rook'),
        requireElement('threshold-bishop'),
        requireElement('threshold-knight')
      ],
      thresholdSize: requireElement('threshold-size'),
      thresholdError: requireElement('threshold-error'),
      resetThresholds: requireElement('btn-reset-thresholds'),
      deadStoneStyle: requireElement('dead-stone-style'),
      captureEffect: requireElement('capture-effect'),
      boardColor: requireElement('board-color'),
      languageSelect: requireElement('language-select'),
      toggleHoverEval: requireElement('toggle-hover-eval'),
      toggleHeatmap: requireElement('toggle-heatmap'),
      heatmapTheme: requireElement('heatmap-theme'),
      toggleAnimations: requireElement('toggle-animations'),
      toggleEvalGraph: requireElement('toggle-eval-graph'),
      toggleEyeHighlight: requireElement('toggle-eye-highlight'),
      wallModel: requireElement('wall-model'),
      fenceModel: requireElement('fence-model'),
      trueEyeModel: requireElement('true-eye-model'),
      toggleFalseEyeModels: requireElement('toggle-false-eye-models'),
      komi: requireElement('komi'),
      newGame: requireElement('btn-new'),
      pass: requireElement('btn-pass'),
      undo: requireElement('btn-undo'),
      evaluate: requireElement('btn-eval'),
      view: requireElement('btn-view'),
      save: requireElement('btn-save'),
      load: requireElement('btn-load'),
      file: requireElement('file-sgf'),
      settings: requireElement('btn-settings'),
      settingsModal: requireElement('settings-modal'),
      settingsClose: requireElement('btn-close-settings'),
      credits: requireElement('btn-credits'),
      creditsModal: requireElement('credits-modal'),
      creditsContent: requireElement('credits-content'),
      creditsClose: requireElement('btn-close-credits'),
      thinking: requireElement('thinking'),
      boot: requireElement('boot'),
      turn: requireElement('turn'),
      score: requireElement('score'),
      btnFirst: requireElement('btn-first'),
      btnPrev: requireElement('btn-prev'),
      btnPlay: requireElement('btn-play'),
      btnNext: requireElement('btn-next'),
      btnLast: requireElement('btn-last'),
      replaySlider: requireElement('replay-slider'),
      replayCounter: requireElement('replay-counter'),
      replaySpeed: requireElement('replay-speed'),
      evalGraphPanel: requireElement('eval-graph-panel'),
      evalGraphInfo: requireElement('eval-graph-info'),
      btnGraphMode: requireElement('btn-graph-mode'),
      btnCloseGraph: requireElement('btn-close-graph'),
      evalGraphCanvas: requireElement('eval-graph-canvas')
    };

    this.config = loadConfig();
    this.opponent = this.config.opponent;
    this.rules = this.config.rules;
    this.cameraProjection = this.config.cameraProjection;
    this.playerSide = this.config.playerSide;
    this.pieceStyle = this.config.pieceStyle;
    this.rankThresholds = this.config.rankThresholds;
    this.deadStoneStyle = this.config.deadStoneStyle;
    this.captureEffect = this.config.captureEffect;
    this.boardColor = this.config.boardColor;
    this.view = this.config.view;
    this.hoverEvalEnabled = this.config.hoverEval;
    this.heatmapEnabled = this.config.heatmap;
    this.heatmapTheme = this.config.heatmapTheme;
    this.animationsEnabled = this.config.animations;
    this.evalGraphEnabled = this.config.evalGraph;
    this.eyeHighlightEnabled = this.config.twoEyeHighlight;
    this.wallModel = this.config.wallModel;
    this.fenceModel = this.config.fenceModel;
    this.trueEyeModel = this.config.trueEyeModel;
    this.falseEyeModelsEnabled = this.config.falseEyeModels;
    this.replaySpeed = this.config.replaySpeed;

    this.els.boardSize.value = String(this.config.boardSize);
    this.els.rules.value = this.rules;
    this.els.cameraProjection.value = this.cameraProjection;
    this.els.komi.value = String(this.config.komi);
    this.els.aiLevel.value = this.opponent;
    this.els.playerSide.value = this.playerSide;
    this.els.pieceStyle.value = this.pieceStyle;
    this.els.deadStoneStyle.value = this.deadStoneStyle;
    this.els.captureEffect.value = this.captureEffect;
    this.els.boardColor.value = this.boardColor;
    this.els.languageSelect.value = this.config.language;
    this.els.toggleHoverEval.checked = this.hoverEvalEnabled;
    this.els.toggleHeatmap.checked = this.heatmapEnabled;
    this.els.heatmapTheme.value = this.heatmapTheme;
    this.els.toggleAnimations.checked = this.animationsEnabled;
    this.els.toggleEvalGraph.checked = this.evalGraphEnabled;
    this.els.toggleEyeHighlight.checked = this.eyeHighlightEnabled;
    this.els.wallModel.value = this.wallModel;
    this.els.fenceModel.value = this.fenceModel;
    this.updateFenceModelAvailability();
    this.els.trueEyeModel.value = this.trueEyeModel;
    this.els.toggleFalseEyeModels.checked = this.falseEyeModelsEnabled;
    this.els.replaySpeed.value = String(this.replaySpeed);

    const size = this.readBoardSize();
    const komi = this.readKomi(size);
    this.goban = new Goban(size, komi);

    setLanguage(this.config.language);

    this.board3d = new Board3D(this.els.canvas3d);
    this.board2d = new Board2D(this.els.canvas2d);
    this.evalGraph = new EvalGraph(
      this.els.evalGraphCanvas,
      this.els.evalGraphPanel,
      this.els.evalGraphInfo,
      this.els.btnGraphMode,
      this.els.btnCloseGraph
    );
    this.evalGraph.onSelectMove((step) => this.goToStep(step));
    this.evalGraph.onVisibilityChange((visible) => this.setEvalGraphEnabled(visible));
    this.setEvalGraphEnabled(this.evalGraphEnabled);

    this.board3d.setCameraProjection(this.cameraProjection);
    this.board3d.setBoardSize(size);
    this.syncThresholdInputs();
    this.updateRankLegend();
    this.board3d.setPerspective(this.playerSide);
    this.setDeadStoneStyle(this.deadStoneStyle);
    void this.board3d.setPieceStyle(this.pieceStyle);
    this.board2d.resize();
    this.board2d.setPerspective(this.playerSide);

    this.board3d.setOnIntersectionClick((index) => void this.humanPlay(index));
    this.board2d.setOnIntersectionClick((index) => void this.humanPlay(index));

    this.board3d.setOnIntersectionHover((index) => this.onHoverIntersection(index));
    this.board2d.setOnIntersectionHover((index) => this.onHoverIntersection(index));

    this.updateRankLegend();
    this.resetHistory();
    this.wireControls();
    this.wireKeyboard();
    this.applyLanguage();
    this.applyView();
    this.render();
    this.updateStatus();

    this.applyLegendStyle();
  }

  async start(): Promise<void> {
    try {
      await this.engine.initialize();
      await this.refreshEvaluation(true);
      if (this.playerSide === 'white' && this.goban.moves.length === 0 && !this.isManualMode()) {
        await this.aiTurn();
      }
    } catch (error) {
      console.error('KataGo initialization failed', error);
      this.els.turn.textContent = t('aiUnavailable');
    } finally {
      this.els.boot.hidden = true;
    }
  }

  private wireControls(): void {
    this.els.newGame.addEventListener('click', () => this.startNewGame());
    this.els.pass.addEventListener('click', () => void this.humanPass());
    this.els.undo.addEventListener('click', () => void this.undo());
    this.els.evaluate.addEventListener('click', () => void this.refreshEvaluation(true));
    this.els.view.addEventListener('click', () => this.toggleView());

    this.els.boardSize.addEventListener('change', () => this.changeBoardSize());
    this.els.cameraProjection.addEventListener('change', () => {
      const value = this.els.cameraProjection.value;
      this.cameraProjection =
        value === 'perspective' ? 'perspective' : 'orthographic';
      this.board3d.setCameraProjection(this.cameraProjection);
      this.persistConfig();
    });
    this.els.rules.addEventListener('change', () => {
      this.rules = this.els.rules.value === 'chinese' ? 'chinese' : 'chinese';
      this.persistConfig();
    });
    this.els.playerSide.addEventListener('change', () => {
      const side = (this.els.playerSide.value as 'black' | 'white') || 'black';
      this.setPlayerSide(side);
    });
    this.els.pieceStyle.addEventListener('change', () => {
      this.pieceStyle = (this.els.pieceStyle.value as PieceStyle) || 'kenney-pets';
      this.applyStylePreset(this.pieceStyle);
      void this.board3d.setPieceStyle(this.pieceStyle);
      this.applyLegendStyle();
      this.persistConfig();
    });
    for (const input of this.els.thresholds) {
      input.addEventListener('input', () => this.validateThresholdInputs());
      input.addEventListener('change', () => this.applyThresholdInputs());
    }
    this.els.resetThresholds.addEventListener('click', () =>
      this.resetRankThresholds()
    );
    this.els.deadStoneStyle.addEventListener('change', () => {
      this.setDeadStoneStyle(this.els.deadStoneStyle.value === 'stone' ? 'stone' : 'cube');
    });
    this.els.captureEffect.addEventListener('change', () => {
      const value = this.els.captureEffect.value;
      this.captureEffect =
        value === 'dissolve' || value === 'height' ? value : 'shatter';
      this.persistConfig();
      this.render();
    });
    this.els.boardColor.addEventListener('change', () => {
      const value = this.els.boardColor.value;
      this.boardColor = isBoardColor(value) ? value : 'wood';
      this.persistConfig();
      this.render();
    });
    this.els.languageSelect.addEventListener('change', () => {
      const lang = this.els.languageSelect.value as Language;
      setLanguage(lang);
      this.applyLanguage();
      this.persistConfig();
    });
    this.els.toggleHoverEval.addEventListener('change', () => {
      this.hoverEvalEnabled = this.els.toggleHoverEval.checked;
      this.persistConfig();
      if (!this.hoverEvalEnabled && this.hoverIndex !== null) {
        this.clearHover();
      }
    });
    this.els.toggleEvalGraph.addEventListener('change', () => {
      this.setEvalGraphEnabled(this.els.toggleEvalGraph.checked);
    });
    this.els.toggleHeatmap.addEventListener('change', () => {
      this.heatmapEnabled = this.els.toggleHeatmap.checked;
      this.persistConfig();
      this.render();
    });
    this.els.heatmapTheme.addEventListener('change', () => {
      const value = this.els.heatmapTheme.value;
      this.heatmapTheme = isHeatmapTheme(value) ? value : 'green-orange';
      this.persistConfig();
      this.render();
    });
    this.els.toggleAnimations.addEventListener('change', () => {
      this.animationsEnabled = this.els.toggleAnimations.checked;
      this.persistConfig();
      this.render();
    });
    this.els.toggleEyeHighlight.addEventListener('change', () => {
      this.eyeHighlightEnabled = this.els.toggleEyeHighlight.checked;
      this.persistConfig();
      this.render();
    });
    this.els.wallModel.addEventListener('change', () => {
      const value = this.els.wallModel.value;
      this.wallModel =
        value === 'off' || value === 'seaweed' || value === 'fence' ? value : 'fence';
      this.updateFenceModelAvailability();
      this.persistConfig();
      this.render();
    });
    this.els.fenceModel.addEventListener('change', () => {
      const value = this.els.fenceModel.value;
      this.fenceModel = isFenceModel(value) ? value : 'dark';
      this.persistConfig();
      this.render();
    });
    this.els.trueEyeModel.addEventListener('change', () => {
      const value = this.els.trueEyeModel.value;
      this.trueEyeModel =
        value === 'off' || value === 'cute' || value === 'trueeye' ? value : 'trueeye';
      this.persistConfig();
      this.render();
    });
    this.els.toggleFalseEyeModels.addEventListener('change', () => {
      this.falseEyeModelsEnabled = this.els.toggleFalseEyeModels.checked;
      this.persistConfig();
      this.render();
    });
    this.els.aiLevel.addEventListener('change', () => {
      const val = this.els.aiLevel.value;
      this.opponent = val === 'kyu' || val === 'manual' ? val : 'dan';
      this.persistConfig();
      this.hoverCache.clear();
      this.updateStatus();
      if (!this.isManualMode() && this.goban.moves.length === 0 && this.playerSide === 'white' && !this.busy) {
        void this.aiTurn();
      } else {
        void this.refreshEvaluation(true);
      }
    });
    this.els.komi.addEventListener('change', () => {
      this.goban.komi = this.readKomi(this.goban.size);
      this.persistConfig();
      this.hoverCache.clear();
      this.updateStatus();
      void this.refreshEvaluation(true);
    });

    this.els.save.addEventListener('click', () => this.saveSGF());
    this.els.load.addEventListener('click', () => this.els.file.click());
    this.els.file.addEventListener('change', () => void this.loadSGF());
    this.els.settings.addEventListener('click', () => this.openSettings());
    this.els.settingsClose.addEventListener('click', () => this.closeSettings());
    this.els.settingsModal.addEventListener('click', (event) => {
      if (event.target === this.els.settingsModal) this.closeSettings();
    });
    this.els.credits.addEventListener('click', () => this.openCredits());
    this.els.creditsClose.addEventListener('click', () => this.closeCredits());
    this.els.creditsModal.addEventListener('click', (event) => {
      if (event.target === this.els.creditsModal) this.closeCredits();
    });

    this.els.btnFirst.addEventListener('click', () => this.firstMove());
    this.els.btnPrev.addEventListener('click', () => this.prevMove());
    this.els.btnPlay.addEventListener('click', () => this.toggleReplay());
    this.els.btnNext.addEventListener('click', () => this.nextMove());
    this.els.btnLast.addEventListener('click', () => this.lastMove());
    this.els.replaySlider.addEventListener('input', () => {
      this.stopReplay();
      this.goToStep(Number(this.els.replaySlider.value));
    });
    this.els.replaySpeed.addEventListener('change', () => {
      this.setReplaySpeed(Number(this.els.replaySpeed.value));
    });
  }

  private wireKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (e.key === 'Escape') {
        if (!this.els.settingsModal.hidden) {
          e.preventDefault();
          this.closeSettings();
          return;
        }
        if (!this.els.creditsModal.hidden) {
          e.preventDefault();
          this.closeCredits();
          return;
        }
      }
      if (activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevMove();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.nextMove();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.firstMove();
      } else if (e.key === 'End') {
        e.preventDefault();
        this.lastMove();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.toggleReplay();
      }
    });
  }

  private applyLanguage(): void {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n') as any;
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title') as any;
      if (key) el.title = t(key);
    });
    this.els.btnPlay.title = this.isPlayingReplay ? t('pause') : t('play');
    if (!this.els.thresholdError.hidden) {
      this.els.thresholdError.textContent = t('rankThresholdsError');
    }
    this.evalGraph.updateLanguage();
    this.applyLegendLabels();
    this.updateViewButtonText();
    this.updateStatus();
  }

  private setDeadStoneStyle(style: DeadStoneStyle): void {
    this.deadStoneStyle = style;
    this.els.deadStoneStyle.value = style;
    this.persistConfig();
    this.board3d.setDeadStoneStyle(style);
    document
      .querySelector<HTMLElement>('#rank-legend li.dead .cube')
      ?.classList.toggle('stone', style === 'stone');
  }

  private updateFenceModelAvailability(): void {
    const enabled = this.wallModel === 'fence';
    this.els.fenceModel.disabled = !enabled;
    document
      .getElementById('label-fence-model')
      ?.classList.toggle('disabled', !enabled);
  }

  private applyStylePreset(style: PieceStyle): void {
    const preset = STYLE_PRESETS[style];
    this.wallModel = preset.wallModel;
    this.trueEyeModel = preset.trueEyeModel;
    this.falseEyeModelsEnabled = preset.falseEyeModels;
    this.boardColor = preset.boardColor;
    this.heatmapTheme = preset.heatmapTheme;
    this.captureEffect = preset.captureEffect;
    this.els.wallModel.value = preset.wallModel;
    this.updateFenceModelAvailability();
    this.els.trueEyeModel.value = preset.trueEyeModel;
    this.els.toggleFalseEyeModels.checked = preset.falseEyeModels;
    this.els.boardColor.value = preset.boardColor;
    this.els.heatmapTheme.value = preset.heatmapTheme;
    this.els.captureEffect.value = preset.captureEffect;
    this.setDeadStoneStyle(preset.deadStoneStyle);
    this.render();
  }

  private setEvalGraphEnabled(enabled: boolean): void {
    this.evalGraphEnabled = enabled;
    this.persistConfig();
    this.els.toggleEvalGraph.checked = enabled;
    this.evalGraph.setVisible(enabled);
    this.board3d.resize();
    this.board2d.resize();
    if (enabled) {
      this.scheduleBackgroundEvaluation();
    }
  }

  private persistConfig(): void {
    this.config = {
      version: 1,
      boardSize: this.goban.size,
      rules: this.rules,
      cameraProjection: this.cameraProjection,
      komi: this.goban.komi,
      opponent: this.opponent,
      playerSide: this.playerSide,
      pieceStyle: this.pieceStyle,
      rankThresholds: this.rankThresholds,
      deadStoneStyle: this.deadStoneStyle,
      captureEffect: this.captureEffect,
      boardColor: this.boardColor,
      language: getLanguage(),
      view: this.view,
      hoverEval: this.hoverEvalEnabled,
      heatmap: this.heatmapEnabled,
      heatmapTheme: this.heatmapTheme,
      animations: this.animationsEnabled,
      evalGraph: this.evalGraphEnabled,
      twoEyeHighlight: this.eyeHighlightEnabled,
      wallModel: this.wallModel,
      fenceModel: this.fenceModel,
      trueEyeModel: this.trueEyeModel,
      falseEyeModels: this.falseEyeModelsEnabled,
      replaySpeed: this.replaySpeed
    };
    saveConfig(this.config);
  }

  private openSettings(): void {
    this.els.creditsModal.hidden = true;
    this.syncThresholdInputs();
    this.els.settingsModal.hidden = false;
    this.els.settingsClose.focus();
  }

  private closeSettings(): void {
    this.els.settingsModal.hidden = true;
    this.els.settings.focus();
  }

  private openCredits(): void {
    this.els.settingsModal.hidden = true;
    this.els.creditsContent.textContent = thirdpartyText;
    this.els.creditsModal.hidden = false;
    this.els.creditsClose.focus();
  }

  private closeCredits(): void {
    this.els.creditsModal.hidden = true;
    this.els.credits.focus();
  }

  private applyLegendStyle(): void {
    const legend = document.getElementById('rank-legend');
    if (!legend) return;
    const isChess = this.pieceStyle === 'clayfoot' || this.pieceStyle === 'dark-yagami';
    legend.classList.toggle('legend-text-only', !isChess);
    legend.style.display =
      this.view === '3d' && this.pieceStyle !== 'stones' ? '' : 'none';
    this.applyLegendLabels();
  }

  private applyLegendLabels(): void {
    const names = PIECE_STYLE_LEGEND_NAMES[this.pieceStyle];
    const ranks: LegendRank[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
    for (const rank of ranks) {
      const element = document.querySelector<HTMLElement>(
        `#rank-legend .name[data-i18n="${rank}"]`
      );
      if (element) element.textContent = names?.[rank] ?? t(rank);
    }
  }

  private updateViewButtonText(): void {
    this.els.view.textContent = this.view === '3d' ? t('toggleView2D') : t('toggleView3D');
  }

  private updateRankLegend(): void {
    const ranges = rankLegendRanges(
      this.goban.size,
      this.rankThresholds[this.goban.size]
    );
    for (const [key, value] of Object.entries(ranges)) {
      const element = document.getElementById(`range-${key}`);
      if (element) element.textContent = value;
    }
  }

  private syncThresholdInputs(): void {
    const size = this.goban.size;
    const thresholds = this.rankThresholds[size];
    this.els.thresholds.forEach((input, index) => {
      input.value = String(Math.round(thresholds[index] * 100));
    });
    this.els.thresholdSize.textContent = `${size}×${size}`;
    this.clearThresholdError();
  }

  private readThresholdInputs(): RankThresholds | null {
    const values = this.els.thresholds.map((input) => Number(input.value));
    if (
      !values.every(
        (value) => Number.isInteger(value) && value >= 1 && value <= 100
      )
    ) {
      return null;
    }
    const [king, queen, rook, bishop, knight] = values;
    if (!(king > queen && queen > rook && rook > bishop && bishop > knight)) {
      return null;
    }
    return [king / 100, queen / 100, rook / 100, bishop / 100, knight / 100];
  }

  private validateThresholdInputs(): void {
    if (this.readThresholdInputs()) {
      this.clearThresholdError();
    } else {
      this.showThresholdError();
    }
  }

  private applyThresholdInputs(): void {
    const thresholds = this.readThresholdInputs();
    if (!thresholds) {
      this.showThresholdError();
      return;
    }
    const size = this.goban.size;
    const current = this.rankThresholds[size];
    if (thresholds.every((value, index) => value === current[index])) {
      this.clearThresholdError();
      return;
    }
    this.rankThresholds = { ...this.rankThresholds, [size]: thresholds };
    this.clearThresholdError();
    this.persistConfig();
    this.updateRankLegend();
    this.render();
  }

  private resetRankThresholds(): void {
    const size = this.goban.size;
    this.rankThresholds = {
      ...this.rankThresholds,
      [size]: defaultThresholds(size)
    };
    this.persistConfig();
    this.syncThresholdInputs();
    this.updateRankLegend();
    this.render();
  }

  private showThresholdError(): void {
    this.els.thresholdError.hidden = false;
    this.els.thresholdError.textContent = t('rankThresholdsError');
    for (const input of this.els.thresholds) {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  private clearThresholdError(): void {
    this.els.thresholdError.hidden = true;
    this.els.thresholdError.textContent = '';
    for (const input of this.els.thresholds) {
      input.removeAttribute('aria-invalid');
    }
  }

  private readBoardSize(): BoardSize {
    const value = Number(this.els.boardSize.value);
    return isBoardSize(value) ? value : 9;
  }

  private readKomi(size: BoardSize): number {
    const value = Number(this.els.komi.value);
    if (!Number.isFinite(value) || value < 0) return DEFAULT_KOMI[size];
    return value;
  }

  private setPlayerSide(side: 'black' | 'white'): void {
    if (this.playerSide === side) return;
    this.playerSide = side;
    this.persistConfig();
    this.board3d.setPerspective(side);
    this.board2d.setPerspective(side);
    this.updateStatus();
    if (this.goban.moves.length === 0 && side === 'white' && !this.busy && !this.isManualMode()) {
      void this.aiTurn();
    }
  }

  private startNewGame(): void {
    this.stopReplay();
    this.clearHover();
    this.hoverCache.clear();
    const size = this.readBoardSize();
    this.goban = new Goban(size, this.readKomi(size));
    this.evaluation = null;
    this.gameOver = false;
    this.board3d.setBoardSize(size);
    this.board3d.setPerspective(this.playerSide);
    this.board2d.resize();
    this.board2d.setPerspective(this.playerSide);
    this.resetHistory();
    this.persistConfig();
    this.render();
    this.updateStatus();
    void this.refreshEvaluation(true);
    if (this.playerSide === 'white' && !this.isManualMode()) {
      void this.aiTurn();
    }
  }

  private changeBoardSize(): void {
    this.stopReplay();
    this.clearHover();
    this.hoverCache.clear();
    const size = this.readBoardSize();
    const komi = DEFAULT_KOMI[size];
    this.els.komi.value = String(komi);
    this.goban = new Goban(size, komi);
    this.evaluation = null;
    this.gameOver = false;
    this.board3d.setBoardSize(size);
    this.syncThresholdInputs();
    this.updateRankLegend();
    this.board3d.setPerspective(this.playerSide);
    this.board2d.resize();
    this.board2d.setPerspective(this.playerSide);
    this.resetHistory();
    this.persistConfig();
    this.render();
    this.updateStatus();
    void this.refreshEvaluation(true);
    if (this.playerSide === 'white' && !this.isManualMode()) {
      void this.aiTurn();
    }
  }

  private toggleView(): void {
    this.view = this.view === '3d' ? '2d' : '3d';
    this.persistConfig();
    this.applyView();
  }

  private applyView(): void {
    const show3d = this.view === '3d';
    this.els.canvas3d.hidden = !show3d;
    this.els.canvas2d.hidden = show3d;
    this.els.canvas3d.style.display = show3d ? 'block' : 'none';
    this.els.canvas2d.style.display = show3d ? 'none' : 'block';
    this.updateViewButtonText();
    this.applyLegendStyle();
    if (show3d) {
      this.board3d.resize();
    } else {
      this.board2d.resize();
      this.render();
    }
  }

  private resetHistory(): void {
    this.stopReplay();
    this.cancelBackgroundEvaluation();
    this.history = [
      {
        board: new Uint8Array(this.goban.board),
        side: this.goban.side,
        ko: this.goban.ko,
        lastMove: this.goban.lastMove,
        moves: [],
        moveRecord: null,
        evalPoint: null
      }
    ];
    this.currentHistoryIndex = 0;
    this.evalGraph.clear();
    this.updateReplayUI();
  }

  private recordSnapshot(record: MoveRecord | null, comment?: string, evalPoint?: EvalPoint | null): void {
    const snapshot: HistorySnapshot = {
      board: new Uint8Array(this.goban.board),
      side: this.goban.side,
      ko: this.goban.ko,
      lastMove: this.goban.lastMove,
      moves: this.goban.moves.map((m) => ({ ...m })),
      moveRecord: record ? { ...record } : null,
      comment,
      evalPoint: evalPoint ?? null
    };
    this.history.push(snapshot);
    this.currentHistoryIndex = this.history.length - 1;
    this.evalGraph.setTotalMoves(this.history.length - 1);
    this.evalGraph.setCurrentStep(this.currentHistoryIndex);
    if (evalPoint) {
      this.evalGraph.setPoint(evalPoint);
    }
    this.updateReplayUI();
  }

  private restoreSnapshot(snapshot: HistorySnapshot): void {
    this.goban.board = new Uint8Array(snapshot.board);
    this.goban.side = snapshot.side;
    this.goban.ko = snapshot.ko;
    this.goban.lastMove = snapshot.lastMove;
    this.goban.moves = snapshot.moves.map((m) => ({ ...m }));
    this.gameOver = this.goban.consecutivePasses >= 2;
  }

  firstMove(): void {
    this.stopReplay();
    this.goToStep(0);
  }

  prevMove(): void {
    this.stopReplay();
    if (this.currentHistoryIndex > 0) {
      this.goToStep(this.currentHistoryIndex - 1);
    }
  }

  nextMove(): void {
    this.stopReplay();
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.goToStep(this.currentHistoryIndex + 1);
    }
  }

  lastMove(): void {
    this.stopReplay();
    this.goToStep(this.history.length - 1);
  }

  toggleReplay(): void {
    if (this.isPlayingReplay) {
      this.stopReplay();
    } else {
      this.startReplay();
    }
  }

  startReplay(): void {
    if (this.history.length <= 1) return;
    if (this.currentHistoryIndex >= this.history.length - 1) {
      this.goToStep(0);
    }
    this.isPlayingReplay = true;
    this.els.btnPlay.textContent = '⏸';
    this.els.btnPlay.title = t('pause');
    this.scheduleReplayTick();
  }

  stopReplay(): void {
    if (this.replayTimer !== null) {
      window.clearTimeout(this.replayTimer);
      this.replayTimer = null;
    }
    this.isPlayingReplay = false;
    this.els.btnPlay.textContent = '▶';
    this.els.btnPlay.title = t('play');
    this.scheduleBackgroundEvaluation();
  }

  private scheduleReplayTick(): void {
    if (this.replayTimer !== null) {
      window.clearTimeout(this.replayTimer);
    }
    this.replayTimer = window.setTimeout(() => this.tickReplay(), this.replaySpeed);
  }

  private tickReplay(): void {
    if (!this.isPlayingReplay) return;
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.goToStep(this.currentHistoryIndex + 1);
      this.scheduleReplayTick();
    } else {
      this.stopReplay();
    }
  }

  setReplaySpeed(speed: number): void {
    this.replaySpeed = speed;
    this.persistConfig();
    if (this.isPlayingReplay) {
      this.scheduleReplayTick();
    }
  }

  goToStep(step: number): void {
    if (step < 0 || step >= this.history.length) return;
    this.currentHistoryIndex = step;
    const snapshot = this.history[step];
    this.restoreSnapshot(snapshot);

    this.clearHover();
    this.hoverCache.clear();
    this.evaluation = null;

    this.updateReplayUI();
    this.evalGraph.setCurrentStep(step);
    this.render();
    this.updateStatus();

    if (!snapshot.evalPoint && !this.busy && !this.isPlayingReplay) {
      void this.refreshEvaluation(false);
    }
  }

  private updateReplayUI(): void {
    const totalMoves = Math.max(0, this.history.length - 1);
    this.els.replaySlider.max = String(totalMoves);
    this.els.replaySlider.value = String(this.currentHistoryIndex);
    this.els.replayCounter.textContent = `${this.currentHistoryIndex} / ${totalMoves}`;

    const isAtStart = this.currentHistoryIndex === 0;
    const isAtEnd = this.currentHistoryIndex === totalMoves;

    this.els.btnFirst.disabled = isAtStart;
    this.els.btnPrev.disabled = isAtStart;
    this.els.btnNext.disabled = isAtEnd;
    this.els.btnLast.disabled = isAtEnd;
    this.els.btnPlay.disabled = totalMoves === 0;
  }

  private async humanPlay(index: number): Promise<void> {
    if (this.busy) return;
    this.stopReplay();

    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
      this.evalGraph.pruneAfter(this.currentHistoryIndex);
      this.restoreSnapshot(this.history[this.currentHistoryIndex]);
    }

    if (this.gameOver) return;
    if (!this.isManualMode()) {
      const humanColor = this.playerSide === 'black' ? BLACK : WHITE;
      if (this.goban.side !== humanColor) return;
    }
    if (!this.goban.play(index)) return;

    this.clearHover();
    this.hoverCache.clear();

    const record = this.goban.moves[this.goban.moves.length - 1];
    record.weight = 0.35;

    this.recordSnapshot(record);
    this.render();
    this.updateStatus();
    this.checkGameOver();
    if (!this.gameOver) {
      if (!this.isManualMode()) {
        await this.aiTurn();
      } else {
        await this.refreshEvaluation(false);
      }
    }
  }

  private async humanPass(): Promise<void> {
    if (this.busy) return;
    this.stopReplay();

    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
      this.evalGraph.pruneAfter(this.currentHistoryIndex);
      this.restoreSnapshot(this.history[this.currentHistoryIndex]);
    }

    if (this.gameOver) return;
    if (!this.isManualMode()) {
      const humanColor = this.playerSide === 'black' ? BLACK : WHITE;
      if (this.goban.side !== humanColor) return;
    }

    this.clearHover();
    this.hoverCache.clear();

    this.goban.pass();
    const record = this.goban.moves[this.goban.moves.length - 1];
    record.weight = 0.3;

    this.recordSnapshot(record);
    this.render();
    this.updateStatus();
    this.checkGameOver();
    if (!this.gameOver) {
      if (!this.isManualMode()) {
        await this.aiTurn();
      } else {
        await this.refreshEvaluation(false);
      }
    }
  }

  private async aiTurn(): Promise<void> {
    if (this.busy || this.gameOver) return;
    this.busy = true;
    this.setThinking(true);
    this.clearHover();
    this.hoverCache.clear();

    try {
      const startTime = performance.now();
      const { move, evaluation } = await this.engine.chooseMove(this.goban, this.level);
      const elapsed = performance.now() - startTime;
      if (elapsed < 280) {
        await new Promise((resolve) => setTimeout(resolve, 280 - elapsed));
      }

      // Record evaluation for the move prior to AI turn (the player's move)
      const prevSnapIndex = this.goban.moves.length;
      if (this.history[prevSnapIndex] && !this.history[prevSnapIndex].evalPoint) {
        const prevPoint: EvalPoint = {
          moveNum: prevSnapIndex,
          winrate: evaluation.winrate,
          scoreLead: evaluation.scoreLead,
          color: this.history[prevSnapIndex].moveRecord?.color ?? 0
        };
        this.history[prevSnapIndex].evalPoint = prevPoint;
        this.evalGraph.setPoint(prevPoint);
      }

      if (move === null) {
        this.goban.pass();
      } else {
        this.goban.play(move);
        const record = this.goban.moves[this.goban.moves.length - 1];
        record.weight = evaluation.policy[move] ?? 0.3;
      }

      const aiRecord = this.goban.moves[this.goban.moves.length - 1];
      this.recordSnapshot(aiRecord);

      try {
        this.evaluation = await this.engine.evaluate(this.goban, this.level);
      } catch {
        this.evaluation = evaluation;
      }

      // Record evaluation for the AI move
      const aiSnapIndex = this.history.length - 1;
      if (this.history[aiSnapIndex]) {
        const aiPoint: EvalPoint = {
          moveNum: aiSnapIndex,
          winrate: this.evaluation.winrate,
          scoreLead: this.evaluation.scoreLead,
          color: aiRecord.color
        };
        this.history[aiSnapIndex].evalPoint = aiPoint;
        this.evalGraph.setPoint(aiPoint);
      }

      this.render();
      this.updateStatus();
      this.checkGameOver();
    } catch (error) {
      console.error('AI move failed', error);
      this.els.turn.textContent = t('aiError');
    } finally {
      this.busy = false;
      this.setThinking(false);
    }
  }

  private async undo(): Promise<void> {
    if (this.busy) return;
    this.stopReplay();
    this.clearHover();
    this.hoverCache.clear();

    if (this.currentHistoryIndex <= 0) return;

    let targetIndex = this.currentHistoryIndex;
    if (this.isManualMode()) {
      targetIndex = Math.max(0, this.currentHistoryIndex - 1);
    } else {
      const humanColor = this.playerSide === 'black' ? BLACK : WHITE;
      let undone = 0;
      while (targetIndex > 0 && undone < 2) {
        targetIndex--;
        undone++;
        if (this.history[targetIndex].side === humanColor) break;
      }
    }

    this.history = this.history.slice(0, targetIndex + 1);
    this.evalGraph.pruneAfter(targetIndex);
    this.goToStep(targetIndex);
    this.gameOver = false;
    this.evaluation = null;
    await this.refreshEvaluation(false);
  }

  private async refreshEvaluation(showThinking: boolean): Promise<void> {
    const token = ++this.evaluationToken;
    if (showThinking) this.setThinking(true);
    try {
      const evaluation = await this.engine.evaluate(this.goban, this.level);
      if (token !== this.evaluationToken) return;
      this.evaluation = evaluation;
      const point: EvalPoint = {
        moveNum: this.currentHistoryIndex,
        winrate: evaluation.winrate,
        scoreLead: evaluation.scoreLead,
        color: this.history[this.currentHistoryIndex]?.moveRecord?.color ?? 0
      };
      if (this.history[this.currentHistoryIndex]) {
        this.history[this.currentHistoryIndex].evalPoint = point;
      }
      this.evalGraph.setPoint(point);
      this.render();
      this.updateStatus();
    } catch (error) {
      console.error('Evaluation failed', error);
    } finally {
      if (token === this.evaluationToken) this.setThinking(false);
    }
  }

  private onHoverIntersection(index: number | null): void {
    if (!this.hoverEvalEnabled || this.busy || this.gameOver) {
      if (this.hoverIndex !== null) this.clearHover();
      return;
    }

    if (!this.isManualMode()) {
      const humanColor = this.playerSide === 'black' ? BLACK : WHITE;
      if (this.goban.side !== humanColor) {
        if (this.hoverIndex !== null) this.clearHover();
        return;
      }
    }

    if (index === null || this.goban.at(index) !== 0 || !this.goban.legal(index)) {
      if (this.hoverIndex !== null) this.clearHover();
      return;
    }

    if (index === this.hoverIndex) return;
    this.hoverIndex = index;

    const cacheKey = `${this.goban.moves.length}:${this.goban.side}:${index}:${this.level}`;
    const cached = this.hoverCache.get(cacheKey);
    if (cached) {
      this.hoverEvaluation = cached;
      this.render();
      this.updateStatus();
      return;
    }

    const token = ++this.hoverToken;
    window.setTimeout(async () => {
      if (token !== this.hoverToken || this.hoverIndex !== index || !this.hoverEvalEnabled) return;
      try {
        const hypothetical = this.goban.clone();
        if (!hypothetical.play(index)) return;
        const evaluation = await this.engine.evaluate(hypothetical, this.level);
        if (token !== this.hoverToken || this.hoverIndex !== index || !this.hoverEvalEnabled) return;
        this.hoverCache.set(cacheKey, evaluation);
        this.hoverEvaluation = evaluation;
        this.render();
        this.updateStatus();
      } catch (err) {
        console.debug('Hover evaluation skipped', err);
      }
    }, 60);
  }

  private clearHover(): void {
    if (this.hoverIndex === null && this.hoverEvaluation === null) return;
    this.hoverIndex = null;
    this.hoverEvaluation = null;
    this.render();
    this.updateStatus();
  }

  private moveWeights(): Map<number, number> {
    const weights = new Map<number, number>();
    for (const record of this.goban.moves) {
      if (record.move !== null) weights.set(record.move, record.weight ?? 0.3);
    }
    return weights;
  }

  private render(): void {
    const activeEval = this.hoverEvaluation ?? this.evaluation;
    const state: RenderState = {
      goban: this.goban,
      evaluation: activeEval,
      moveWeights: this.moveWeights(),
      opponentColor: this.isManualMode() ? null : this.playerSide === 'black' ? WHITE : BLACK,
      showHeatmap: this.heatmapEnabled,
      heatmapTheme: this.heatmapTheme,
      boardColor: this.boardColor,
      animations: this.animationsEnabled,
      showTwoEyeHighlight: this.eyeHighlightEnabled,
      rankThresholds: this.rankThresholds[this.goban.size],
      wallModel: this.wallModel,
      fenceModel: this.fenceModel,
      trueEyeModel: this.trueEyeModel,
      showFalseEyeModels: this.falseEyeModelsEnabled,
      captureEffect: this.captureEffect
    };
    this.board3d.update(state);
    this.board2d.update(
      this.goban,
      activeEval,
      this.heatmapEnabled,
      this.eyeHighlightEnabled,
      this.heatmapTheme,
      this.boardColor
    );
  }

  private formatIntersection(index: number): string {
    const col = index % this.goban.size;
    const row = Math.floor(index / this.goban.size);
    const colNum = col + 1;
    const rowNum = row + 1;
    const standard = formatCoordinate(index, this.goban.size);
    return `${colNum},${rowNum} (${standard})`;
  }

  private updateStatus(): void {
    this.els.score.classList.remove('preview', 'up', 'down');
    let lastInfo = '';
    if (this.goban.moves.length > 0) {
      const lastRecord = this.goban.moves[this.goban.moves.length - 1];
      const lastColor = lastRecord.color === BLACK ? t('black') : t('white');
      const coord =
        lastRecord.move !== null
          ? this.formatIntersection(lastRecord.move)
          : t('passMove');
      lastInfo = ` · ${t('lastMove', { color: lastColor, coord })}`;
    }

    const currentSnapshot = this.history[this.currentHistoryIndex];
    const commentText = currentSnapshot?.comment ? ` · [${currentSnapshot.comment}]` : '';

    if (this.gameOver) {
      const result = this.goban.score();
      const winner =
        result.winner === BLACK ? t('black') : result.winner === WHITE ? t('white') : t('draw');
      const margin = result.winner === 0 ? '' : t('byMargin', { margin: result.margin.toFixed(1) });
      this.els.turn.textContent = `${t('gameOver', { winner, margin })}${lastInfo}${commentText}`;
      this.els.score.textContent = `B ${result.black.toFixed(1)} : ${result.white.toFixed(1)} W (komi ${result.komi})`;
      return;
    }

    const side = this.goban.side === BLACK ? t('black') : t('white');
    const humanColor = this.playerSide === 'black' ? BLACK : WHITE;
    const isHumanTurn = this.goban.side === humanColor;
    const whoseTurn = isHumanTurn ? '' : ' [AI]';

    this.els.turn.textContent =
      this.goban.moves.length === 0
        ? `${t('blackToPlay')}${whoseTurn}${commentText}`
        : `${t('turnToPlay', { side, move: this.goban.moves.length + 1 })}${whoseTurn}${lastInfo}${commentText}`;

    const activeEval = this.hoverEvaluation ?? this.evaluation;
    const fallbackPoint = activeEval ? null : currentSnapshot?.evalPoint;
    if (activeEval) {
      const lead = activeEval.scoreLead;
      const label =
        Math.abs(lead) < 0.05
          ? t('even')
          : `${lead > 0 ? 'B' : 'W'} +${Math.abs(lead).toFixed(1)}`;
      const win = activeEval.winrate;
      const isBlackFavored = win >= 0.5;
      const winPct = ((isBlackFavored ? win : 1 - win) * 100).toFixed(0);
      const winSide = isBlackFavored ? 'B' : 'W';
      const winLabel = `${winPct}% ${winSide}`;
      const padded = activeEval.padded ? ` · ${t('paddedNet')}` : '';
      const isHover = this.hoverEvaluation !== null && this.hoverIndex !== null;
      if (isHover && this.evaluation) {
        const sign = this.goban.side === BLACK ? 1 : -1;
        const delta = (activeEval.scoreLead - this.evaluation.scoreLead) * sign;
        if (delta > 0.05) this.els.score.classList.add('preview', 'up');
        else if (delta < -0.05) this.els.score.classList.add('preview', 'down');
      }
      const hoverPrefix = isHover
        ? `[${t('preview')} ${this.formatIntersection(this.hoverIndex!)}] `
        : '';
      this.els.score.textContent = `${hoverPrefix}${label} · ${winLabel}${padded}`;
    } else if (fallbackPoint) {
      const lead = fallbackPoint.scoreLead;
      const label =
        Math.abs(lead) < 0.05
          ? t('even')
          : `${lead > 0 ? 'B' : 'W'} +${Math.abs(lead).toFixed(1)}`;
      const win = fallbackPoint.winrate;
      const isBlackFavored = win >= 0.5;
      const winPct = ((isBlackFavored ? win : 1 - win) * 100).toFixed(0);
      const winSide = isBlackFavored ? 'B' : 'W';
      const winLabel = `${winPct}% ${winSide}`;
      this.els.score.textContent = `${label} · ${winLabel}`;
    } else {
      this.els.score.textContent = '';
    }
  }

  private checkGameOver(): void {
    if (this.goban.consecutivePasses >= 2) {
      this.gameOver = true;
      this.updateStatus();
    }
  }

  private setThinking(active: boolean): void {
    this.els.thinking.hidden = !active;
  }

  private saveSGF(): void {
    let resultStr = '';
    if (this.gameOver) {
      const score = this.goban.score();
      if (score.winner === BLACK) {
        resultStr = `B+${score.margin.toFixed(1)}`;
      } else if (score.winner === WHITE) {
        resultStr = `W+${score.margin.toFixed(1)}`;
      } else {
        resultStr = '0';
      }
    }

    const today = new Date().toISOString().split('T')[0];
    let pb = 'Human (Black)';
    let pw = 'Human (White)';
    if (!this.isManualMode()) {
      pb = this.playerSide === 'black' ? 'Human (Black)' : `KataGo AI (${this.level.toUpperCase()})`;
      pw = this.playerSide === 'white' ? 'Human (White)' : `KataGo AI (${this.level.toUpperCase()})`;
    }
    const sgfText = generateSGF(this.goban, {
      blackPlayer: pb,
      whitePlayer: pw,
      result: resultStr,
      date: today,
      rules: 'Chinese'
    });

    const blob = new Blob([sgfText], { type: 'application/x-go-sgf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    anchor.download = `GoGame-${this.goban.size}x${this.goban.size}-${timeStr}.sgf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private async loadSGF(): Promise<void> {
    const file = this.els.file.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      console.warn('SGF file rejected: exceeds 5MB limit');
      this.els.turn.textContent = t('invalidSgf');
      return;
    }
    this.stopReplay();
    this.clearHover();
    this.hoverCache.clear();

    try {
      const text = await file.text();
      const parsed = parseSGF(text);
      const size = parsed.size;
      if (!isBoardSize(size)) {
        throw new Error(`Unsupported board size: ${size}`);
      }

      this.els.boardSize.value = String(size);
      this.els.komi.value = String(parsed.komi);
      this.goban = new Goban(size, parsed.komi);
      this.board3d.setBoardSize(size);
      this.syncThresholdInputs();
      this.updateRankLegend();
      this.board3d.setPerspective('black');
      this.board2d.resize();
      this.board2d.setPerspective('black');
      this.playerSide = 'black';
      this.els.playerSide.value = 'black';

      this.history = [];

      // Step 0: Initial position with handicap stones if present
      for (const stone of parsed.handicapStones) {
        if (stone >= 0 && stone < this.goban.area) {
          this.goban.board[stone] = BLACK;
        }
      }
      this.goban.side = parsed.handicapStones.length > 0 ? WHITE : BLACK;

      this.history.push({
        board: new Uint8Array(this.goban.board),
        side: this.goban.side,
        ko: this.goban.ko,
        lastMove: this.goban.lastMove,
        moves: [],
        moveRecord: null
      });

      // Populate history with every move in the SGF
      for (const m of parsed.moves) {
        this.goban.side = m.color;
        if (m.move === null) {
          this.goban.pass();
        } else {
          this.goban.play(m.move);
        }
        const record = this.goban.moves[this.goban.moves.length - 1];
        if (record) {
          record.weight = 0.35;
        }
        this.history.push({
          board: new Uint8Array(this.goban.board),
          side: this.goban.side,
          ko: this.goban.ko,
          lastMove: this.goban.lastMove,
          moves: this.goban.moves.map((mv) => ({ ...mv })),
          moveRecord: record ? { ...record } : null,
          comment: m.comment
        });
      }

      // Jump to the final move for initial view
      this.currentHistoryIndex = this.history.length - 1;
      this.restoreSnapshot(this.history[this.currentHistoryIndex]);

      this.evaluation = null;
      this.cancelBackgroundEvaluation();
      this.evalGraph.clear();
      this.evalGraph.setTotalMoves(this.history.length - 1);
      this.evalGraph.setCurrentStep(this.currentHistoryIndex);
      this.scheduleBackgroundEvaluation();

      this.updateReplayUI();
      this.render();
      this.updateStatus();

      const movesCount = parsed.moves.length;
      this.els.turn.textContent = `${t('sgfLoaded', { moves: movesCount })} · ${parsed.blackPlayer} vs ${parsed.whitePlayer}`;
    } catch (error) {
      console.error('Failed to load SGF', error);
      this.els.turn.textContent = t('invalidSgf');
    } finally {
      this.els.file.value = '';
    }
  }

  private cancelBackgroundEvaluation(): void {
    if (this.bgEvalTimer !== null) {
      window.clearTimeout(this.bgEvalTimer);
      this.bgEvalTimer = null;
    }
  }

  private scheduleBackgroundEvaluation(): void {
    this.cancelBackgroundEvaluation();
    if (this.busy || this.isPlayingReplay || !this.evalGraphEnabled || this.bgEvalActive) {
      return;
    }
    this.bgEvalTimer = window.setTimeout(() => void this.runBackgroundEvalStep(), 200);
  }

  private async runBackgroundEvalStep(): Promise<void> {
    this.bgEvalTimer = null;
    if (this.busy || this.isPlayingReplay || !this.evalGraphEnabled || this.bgEvalActive) {
      return;
    }

    let targetIndex = -1;
    if (this.history[this.currentHistoryIndex] && !this.history[this.currentHistoryIndex].evalPoint) {
      targetIndex = this.currentHistoryIndex;
    } else {
      for (let i = 0; i < this.history.length; i++) {
        if (!this.history[i].evalPoint) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) return;

    const snapshot = this.history[targetIndex];
    if (!snapshot) return;

    this.bgEvalActive = true;
    try {
      const tempGoban = new Goban(this.goban.size, this.goban.komi);
      for (const m of snapshot.moves) {
        if (m.move === null) tempGoban.pass();
        else tempGoban.play(m.move);
      }
      const evaluation = await this.engine.evaluate(tempGoban, this.level);
      if (this.history[targetIndex] === snapshot) {
        const point: EvalPoint = {
          moveNum: targetIndex,
          winrate: evaluation.winrate,
          scoreLead: evaluation.scoreLead,
          color: snapshot.moveRecord?.color ?? 0
        };
        snapshot.evalPoint = point;
        this.evalGraph.setPoint(point);
        if (targetIndex === this.currentHistoryIndex) {
          this.updateStatus();
        }
      }
    } catch (err) {
      console.debug('Background eval step skipped', err);
    } finally {
      this.bgEvalActive = false;
      if (!this.busy && !this.isPlayingReplay && this.evalGraphEnabled) {
        this.scheduleBackgroundEvaluation();
      }
    }
  }
}
