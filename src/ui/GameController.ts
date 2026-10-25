import { Goban, BLACK, WHITE } from '../game/Goban';
import { DEFAULT_KOMI, isBoardSize, type BoardSize } from '../game/BoardSize';
import { KataGoEngine, type Evaluation } from '../ai/KataGoEngine';
import type { AILevel } from '../ai/registry';
import { Board3D, type RenderState } from './Board3D';
import { Board2D } from './Board2D';

interface Elements {
  canvas3d: HTMLCanvasElement;
  canvas2d: HTMLCanvasElement;
  boardSize: HTMLSelectElement;
  aiLevel: HTMLSelectElement;
  komi: HTMLInputElement;
  newGame: HTMLButtonElement;
  pass: HTMLButtonElement;
  undo: HTMLButtonElement;
  evaluate: HTMLButtonElement;
  view: HTMLButtonElement;
  save: HTMLButtonElement;
  load: HTMLButtonElement;
  file: HTMLInputElement;
  thinking: HTMLElement;
  boot: HTMLElement;
  turn: HTMLElement;
  score: HTMLElement;
}

type ViewMode = '3d' | '2d';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export class GameController {
  private readonly engine = new KataGoEngine();
  private readonly board3d: Board3D;
  private readonly board2d: Board2D;
  private readonly els: Elements;

  private goban: Goban;
  private level: AILevel = 'dan';
  private view: ViewMode = '3d';
  private evaluation: Evaluation | null = null;
  private busy = false;
  private gameOver = false;
  private evaluationToken = 0;

  constructor() {
    this.els = {
      canvas3d: requireElement('scene3d'),
      canvas2d: requireElement('scene2d'),
      boardSize: requireElement('board-size'),
      aiLevel: requireElement('ai-level'),
      komi: requireElement('komi'),
      newGame: requireElement('btn-new'),
      pass: requireElement('btn-pass'),
      undo: requireElement('btn-undo'),
      evaluate: requireElement('btn-eval'),
      view: requireElement('btn-view'),
      save: requireElement('btn-save'),
      load: requireElement('btn-load'),
      file: requireElement('file-sgf'),
      thinking: requireElement('thinking'),
      boot: requireElement('boot'),
      turn: requireElement('turn'),
      score: requireElement('score')
    };

    const size = this.readBoardSize();
    const komi = this.readKomi(size);
    this.goban = new Goban(size, komi);

    this.level = this.els.aiLevel.value === 'kyu' ? 'kyu' : 'dan';

    this.board3d = new Board3D(this.els.canvas3d);
    this.board2d = new Board2D(this.els.canvas2d);
    this.board3d.setBoardSize(size);
    this.board2d.resize();

    this.board3d.setOnIntersectionClick((index) => void this.humanPlay(index));
    this.board2d.setOnIntersectionClick((index) => void this.humanPlay(index));

    this.wireControls();
    this.render();
    this.updateStatus();
  }

  async start(): Promise<void> {
    try {
      await this.engine.initialize();
      await this.refreshEvaluation(true);
    } catch (error) {
      console.error('KataGo initialization failed', error);
      this.els.turn.textContent = 'AI unavailable — check console';
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
    this.els.aiLevel.addEventListener('change', () => {
      this.level = this.els.aiLevel.value === 'kyu' ? 'kyu' : 'dan';
      void this.refreshEvaluation(true);
    });
    this.els.komi.addEventListener('change', () => {
      this.goban.komi = this.readKomi(this.goban.size);
      this.updateStatus();
      void this.refreshEvaluation(true);
    });

    this.els.save.addEventListener('click', () => this.saveSGF());
    this.els.load.addEventListener('click', () => this.els.file.click());
    this.els.file.addEventListener('change', () => void this.loadSGF());
  }

  private readBoardSize(): BoardSize {
    const value = Number(this.els.boardSize.value);
    return isBoardSize(value) ? value : 19;
  }

  private readKomi(size: BoardSize): number {
    const value = Number(this.els.komi.value);
    if (!Number.isFinite(value) || value < 0) return DEFAULT_KOMI[size];
    return value;
  }

  private startNewGame(): void {
    const size = this.readBoardSize();
    this.goban = new Goban(size, this.readKomi(size));
    this.evaluation = null;
    this.gameOver = false;
    this.board3d.setBoardSize(size);
    this.board2d.resize();
    this.render();
    this.updateStatus();
    void this.refreshEvaluation(true);
  }

  private changeBoardSize(): void {
    const size = this.readBoardSize();
    const komi = DEFAULT_KOMI[size];
    this.els.komi.value = String(komi);
    this.goban = new Goban(size, komi);
    this.evaluation = null;
    this.gameOver = false;
    this.board3d.setBoardSize(size);
    this.board2d.resize();
    this.render();
    this.updateStatus();
    void this.refreshEvaluation(true);
  }

  private toggleView(): void {
    this.view = this.view === '3d' ? '2d' : '3d';
    const show3d = this.view === '3d';
    this.els.canvas3d.hidden = !show3d;
    this.els.canvas2d.hidden = show3d;
    this.els.view.textContent = show3d ? '2D' : '3D';
    if (show3d) this.board3d.resize();
    else {
      this.board2d.resize();
      this.render();
    }
  }

  private async humanPlay(index: number): Promise<void> {
    if (this.busy || this.gameOver) return;
    if (this.goban.side !== BLACK) return;
    if (!this.goban.play(index)) return;

    const record = this.goban.moves[this.goban.moves.length - 1];
    record.weight = 0.35;

    this.render();
    this.updateStatus();
    this.checkGameOver();
    if (!this.gameOver) await this.aiTurn();
  }

  private async humanPass(): Promise<void> {
    if (this.busy || this.gameOver) return;
    if (this.goban.side !== BLACK) return;

    this.goban.pass();
    const record = this.goban.moves[this.goban.moves.length - 1];
    record.weight = 0.3;

    this.render();
    this.updateStatus();
    this.checkGameOver();
    if (!this.gameOver) await this.aiTurn();
  }

  private async aiTurn(): Promise<void> {
    if (this.busy || this.gameOver) return;
    this.busy = true;
    this.setThinking(true);

    try {
      const { move, evaluation } = await this.engine.chooseMove(this.goban, this.level);
      if (move === null) {
        this.goban.pass();
      } else {
        this.goban.play(move);
        const record = this.goban.moves[this.goban.moves.length - 1];
        record.weight = evaluation.policy[move] ?? 0.3;
      }

      try {
        this.evaluation = await this.engine.evaluate(this.goban, this.level);
      } catch {
        this.evaluation = evaluation;
      }

      this.render();
      this.updateStatus();
      this.checkGameOver();
    } catch (error) {
      console.error('AI move failed', error);
      this.els.turn.textContent = 'AI error — check console';
    } finally {
      this.busy = false;
      this.setThinking(false);
    }
  }

  private async undo(): Promise<void> {
    if (this.busy) return;
    let undone = 0;
    while (undone < 2 && this.goban.undo()) {
      undone++;
      if (this.goban.side === BLACK) break;
    }
    if (undone === 0) return;
    this.gameOver = false;
    this.evaluation = null;
    this.render();
    this.updateStatus();
    await this.refreshEvaluation(false);
  }

  private async refreshEvaluation(showThinking: boolean): Promise<void> {
    const token = ++this.evaluationToken;
    if (showThinking) this.setThinking(true);
    try {
      const evaluation = await this.engine.evaluate(this.goban, this.level);
      if (token !== this.evaluationToken) return;
      this.evaluation = evaluation;
      this.render();
      this.updateStatus();
    } catch (error) {
      console.error('Evaluation failed', error);
    } finally {
      if (token === this.evaluationToken) this.setThinking(false);
    }
  }

  private moveWeights(): Map<number, number> {
    const weights = new Map<number, number>();
    for (const record of this.goban.moves) {
      if (record.move !== null) weights.set(record.move, record.weight ?? 0.3);
    }
    return weights;
  }

  private render(): void {
    const state: RenderState = {
      goban: this.goban,
      evaluation: this.evaluation,
      moveWeights: this.moveWeights()
    };
    this.board3d.update(state);
    this.board2d.update(this.goban, this.evaluation);
  }

  private updateStatus(): void {
    if (this.gameOver) {
      const result = this.goban.score();
      const winner =
        result.winner === BLACK ? 'Black' : result.winner === WHITE ? 'White' : 'Draw';
      const margin = result.winner === 0 ? '' : ` by ${result.margin.toFixed(1)}`;
      this.els.turn.textContent = `Game over — ${winner}${margin}`;
      this.els.score.textContent = `B ${result.black.toFixed(1)} : ${result.white.toFixed(1)} W (komi ${result.komi})`;
      return;
    }

    const side = this.goban.side === BLACK ? 'Black' : 'White';
    this.els.turn.textContent =
      this.goban.moves.length === 0
        ? 'Black to play'
        : `${side} to play · move ${this.goban.moves.length + 1}`;

    if (this.evaluation) {
      const lead = this.evaluation.scoreLead;
      const label =
        Math.abs(lead) < 0.05
          ? 'Even'
          : `${lead > 0 ? 'B' : 'W'} +${Math.abs(lead).toFixed(1)}`;
      const win = this.evaluation.winrate;
      const winLabel = `${(win * 100).toFixed(0)}% B`;
      const padded = this.evaluation.padded ? ' · padded 19x19 net' : '';
      this.els.score.textContent = `${label} · ${winLabel}${padded}`;
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
    const blob = new Blob([this.goban.toSGF()], { type: 'application/x-go-sgf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `go-${this.goban.size}x${this.goban.size}.sgf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private async loadSGF(): Promise<void> {
    const file = this.els.file.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const sizeMatch = text.match(/SZ\[(\d+)\]/);
      const size = sizeMatch ? Number(sizeMatch[1]) : this.goban.size;
      if (!isBoardSize(size)) throw new Error(`Unsupported board size: ${size}`);

      if (size !== this.goban.size) {
        this.els.boardSize.value = String(size);
        this.goban = new Goban(size, DEFAULT_KOMI[size]);
        this.els.komi.value = String(DEFAULT_KOMI[size]);
        this.board3d.setBoardSize(size);
      } else {
        this.goban.reset();
      }

      this.goban.loadSGF(text);
      this.els.komi.value = String(this.goban.komi);
      this.evaluation = null;
      this.gameOver = false;
      this.render();
      this.updateStatus();
      await this.refreshEvaluation(true);

      if (!this.gameOver && this.goban.side === WHITE) await this.aiTurn();
    } catch (error) {
      console.error('Failed to load SGF', error);
      this.els.turn.textContent = 'Invalid SGF file';
    } finally {
      this.els.file.value = '';
    }
  }
}
