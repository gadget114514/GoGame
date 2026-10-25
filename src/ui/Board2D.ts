import { BLACK, WHITE, type Goban } from '../game/Goban';
import type { Evaluation } from '../ai/KataGoEngine';
import { starPoints, COORD_LETTERS } from '../game/BoardSize';
import { heatColor } from './heatmap';
import { pieceRank } from './pieceRank';

export class Board2D {
  private ctx: CanvasRenderingContext2D;
  private cssWidth = 1;
  private cssHeight = 1;
  private margin = 0;
  private cell = 1;
  private size = 19;
  private goban: Goban | null = null;
  private evaluation: Evaluation | null = null;
  private clickHandler: ((index: number) => void) | null = null;
  private hoverHandler: ((index: number | null) => void) | null = null;
  private hoverIndex: number | null = null;
  private perspective: 'black' | 'white' = 'black';

  private prevMoveCount = 0;
  private lastMoveAnimStartTime = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is not supported');
    this.ctx = context;
    window.addEventListener('resize', this.resize);
    canvas.addEventListener('pointerup', (event) => this.onPointerUp(event));
    canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    canvas.addEventListener('pointerleave', () => this.onPointerLeave());
  }

  setPerspective(side: 'black' | 'white'): void {
    if (this.perspective === side) return;
    this.perspective = side;
    this.render();
  }

  setOnIntersectionClick(handler: (index: number) => void): void {
    this.clickHandler = handler;
  }

  setOnIntersectionHover(handler: (index: number | null) => void): void {
    this.hoverHandler = handler;
  }

  resize = (): void => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
    this.render();
  };

  update(goban: Goban, evaluation: Evaluation | null): void {
    if (goban.moves.length === this.prevMoveCount + 1 && goban.lastMove !== null) {
      this.lastMoveAnimStartTime = performance.now();
    }
    this.prevMoveCount = goban.moves.length;
    this.goban = goban;
    this.evaluation = evaluation;
    if (goban.size !== this.size) {
      this.size = goban.size;
      this.layout();
    }
    this.render();
  }

  private layout(): void {
    const extent = Math.min(this.cssWidth, this.cssHeight) * 0.86;
    this.margin = (Math.min(this.cssWidth, this.cssHeight) - extent) / 2;
    this.cell = extent / Math.max(1, this.size - 1);
  }

  private coordToCanvas(col: number, row: number): { x: number; y: number } {
    const drawCol = this.perspective === 'white' ? this.size - 1 - col : col;
    const drawRow = this.perspective === 'white' ? this.size - 1 - row : row;
    return {
      x: this.margin + drawCol * this.cell,
      y: this.margin + drawRow * this.cell
    };
  }

  private canvasToCoord(canvasX: number, canvasY: number): { col: number; row: number } {
    const rawCol = Math.round((canvasX - this.margin) / this.cell);
    const rawRow = Math.round((canvasY - this.margin) / this.cell);
    const col = this.perspective === 'white' ? this.size - 1 - rawCol : rawCol;
    const row = this.perspective === 'white' ? this.size - 1 - rawRow : rawRow;
    return { col, row };
  }

  private render(): void {
    const { ctx } = this;
    if (this.cssWidth <= 1) return;
    this.layout();

    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const span = (this.size - 1) * this.cell;
    const pad = this.cell * 0.7;
    const x0 = this.margin - pad;
    const y0 = this.margin - pad;
    const boardExtent = span + pad * 2;

    ctx.fillStyle = '#c99755';
    ctx.fillRect(x0, y0, boardExtent, boardExtent);

    // Board Coordinates
    const last = this.goban?.lastMove ?? null;
    const lastCol = last !== null ? last % this.size : -1;
    const lastRow = last !== null ? Math.floor(last / this.size) : -1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelPad = Math.max(11, this.cell * 0.44);
    const isWhite = this.perspective === 'white';

    for (let i = 0; i < this.size; i++) {
      const pos = this.margin + i * this.cell;

      // Column labels (top and bottom border)
      // For Black: Left is 1, Right is size (Top-Left is 1,1; Bottom-Right is size,size)
      // For White: Left is size, Right is 1 (Screen Top-Left is size,size; Bottom-Right is 1,1)
      const colNum = isWhite ? this.size - i : i + 1;
      const colStr = String(colNum);
      const actualCol = isWhite ? this.size - 1 - i : i;
      const isColActive = actualCol === lastCol;

      ctx.fillStyle = isColActive ? '#d97706' : '#221408';
      ctx.font = isColActive
        ? `bold ${Math.max(12, this.cell * 0.38)}px "Segoe UI", -apple-system, system-ui, sans-serif`
        : `700 ${Math.max(11, this.cell * 0.34)}px "Segoe UI", -apple-system, system-ui, sans-serif`;

      ctx.fillText(colStr, pos, this.margin - labelPad);
      ctx.fillText(colStr, pos, this.margin + span + labelPad);

      // Row labels (left and right border)
      // For Black: Top is 1, Bottom is size (Top-Left is 1,1; Bottom-Right is size,size)
      // For White: Top is size, Bottom is 1 (Screen Top-Left is size,size; Bottom-Right is 1,1)
      const rowNum = isWhite ? this.size - i : i + 1;
      const rowStr = String(rowNum);
      const actualRow = isWhite ? this.size - 1 - i : i;
      const isRowActive = actualRow === lastRow;

      ctx.fillStyle = isRowActive ? '#d97706' : '#221408';
      ctx.font = isRowActive
        ? `bold ${Math.max(12, this.cell * 0.38)}px "Segoe UI", -apple-system, system-ui, sans-serif`
        : `700 ${Math.max(11, this.cell * 0.34)}px "Segoe UI", -apple-system, system-ui, sans-serif`;

      ctx.fillText(rowStr, this.margin - labelPad, pos);
      ctx.fillText(rowStr, this.margin + span + labelPad, pos);
    }

    // Grid.
    ctx.strokeStyle = 'rgba(60, 38, 18, 0.85)';
    ctx.lineWidth = Math.max(1, this.cell * 0.035);
    ctx.beginPath();
    for (let i = 0; i < this.size; i++) {
      const offset = this.margin + i * this.cell;
      ctx.moveTo(this.margin, offset);
      ctx.lineTo(this.margin + span, offset);
      ctx.moveTo(offset, this.margin);
      ctx.lineTo(offset, this.margin + span);
    }
    ctx.stroke();

    // Star points.
    ctx.fillStyle = 'rgba(50, 32, 15, 0.9)';
    for (const index of starPoints(this.size as 9 | 13 | 19)) {
      const row = Math.floor(index / this.size);
      const col = index % this.size;
      const { x, y } = this.coordToCanvas(col, row);
      ctx.beginPath();
      ctx.arc(
        x,
        y,
        Math.max(1.5, this.cell * 0.07),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Ownership heat.
    const ownership = this.evaluation?.ownership;
    if (ownership && this.goban && ownership.length >= this.goban.area) {
      for (let index = 0; index < this.goban.area; index++) {
        const row = Math.floor(index / this.size);
        const col = index % this.size;
        const [r, g, b, a] = heatColor(ownership[index]);
        const { x, y } = this.coordToCanvas(col, row);
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          this.cell * 0.42,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.fill();
      }
    }

    // Stones.
    const radius = this.cell * 0.44;
    for (let index = 0; index < this.size * this.size; index++) {
      const color = this.goban?.board[index] ?? 0;
      if (color !== BLACK && color !== WHITE) continue;
      const row = Math.floor(index / this.size);
      const col = index % this.size;
      const { x, y } = this.coordToCanvas(col, row);
      const ownership = this.evaluation?.ownership[index] ?? 0;
      const { dead } = pieceRank(ownership, color, false);
      if (dead) {
        const size = radius * 1.1;
        ctx.fillStyle = color === BLACK ? 'rgba(10,10,14,0.8)' : 'rgba(245,240,230,0.85)';
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        ctx.strokeStyle = color === BLACK ? 'rgba(0,0,0,0.6)' : 'rgba(120,110,95,0.8)';
        ctx.lineWidth = Math.max(1, this.cell * 0.02);
        ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        continue;
      }

      let currentRadius = radius;
      const isJustPlaced = index === last && this.lastMoveAnimStartTime > 0;
      let animProgress = 1;
      if (isJustPlaced) {
        const elapsed = performance.now() - this.lastMoveAnimStartTime;
        if (elapsed < 480) {
          animProgress = elapsed / 480;
          const scale = 1.0 + 0.4 * Math.pow(1 - animProgress, 2);
          currentRadius = radius * scale;
        } else {
          this.lastMoveAnimStartTime = 0;
        }
      }

      const gradient = ctx.createRadialGradient(
        x - currentRadius * 0.3,
        y - currentRadius * 0.3,
        currentRadius * 0.15,
        x,
        y,
        currentRadius
      );
      if (color === BLACK) {
        gradient.addColorStop(0, '#4a4a55');
        gradient.addColorStop(1, '#0a0a0e');
      } else {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#cfc8ba');
      }
      ctx.beginPath();
      ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = color === BLACK ? 'rgba(0,0,0,0.6)' : 'rgba(120,110,95,0.8)';
      ctx.lineWidth = Math.max(1, this.cell * 0.02);
      ctx.stroke();

      if (isJustPlaced && animProgress < 1) {
        const rippleR = radius + this.cell * 0.65 * animProgress;
        const rippleAlpha = (1 - animProgress) * 0.75;
        ctx.beginPath();
        ctx.arc(x, y, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = color === BLACK ? `rgba(217, 160, 102, ${rippleAlpha})` : `rgba(180, 210, 245, ${rippleAlpha})`;
        ctx.lineWidth = Math.max(1.5, this.cell * 0.04);
        ctx.stroke();
      }
    }

    // Last move marker.
    if (last !== null) {
      const row = Math.floor(last / this.size);
      const col = last % this.size;
      const color = this.goban?.board[last] ?? BLACK;
      const { x: cx, y: cy } = this.coordToCanvas(col, row);

      // Outer contrasting accent ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
      ctx.strokeStyle = color === BLACK ? '#ff7a45' : '#06b6d4';
      ctx.lineWidth = Math.max(2.5, this.cell * 0.075);
      ctx.stroke();

      // Inner high-contrast dot
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, radius * 0.18), 0, Math.PI * 2);
      ctx.fillStyle = color === BLACK ? '#ffffff' : '#0f172a';
      ctx.fill();
    }

    // Hover preview ghost stone
    if (this.hoverIndex !== null && this.goban && this.goban.board[this.hoverIndex] === 0) {
      const hRow = Math.floor(this.hoverIndex / this.size);
      const hCol = this.hoverIndex % this.size;
      const { x: hx, y: hy } = this.coordToCanvas(hCol, hRow);
      ctx.beginPath();
      ctx.arc(hx, hy, radius * 0.88, 0, Math.PI * 2);
      ctx.fillStyle = this.goban.side === BLACK ? 'rgba(25, 25, 30, 0.45)' : 'rgba(255, 255, 255, 0.65)';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(1.5, this.cell * 0.04);
      ctx.stroke();
    }

    if (this.lastMoveAnimStartTime > 0 && performance.now() - this.lastMoveAnimStartTime < 480) {
      requestAnimationFrame(() => this.render());
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.goban) return;
    const { col, row } = this.canvasToCoord(event.offsetX, event.offsetY);
    if (col < 0 || col >= this.size || row < 0 || row >= this.size) {
      if (this.hoverIndex !== null) {
        this.hoverIndex = null;
        this.render();
        this.hoverHandler?.(null);
      }
      return;
    }
    const { x: cx, y: cy } = this.coordToCanvas(col, row);
    if (Math.hypot(event.offsetX - cx, event.offsetY - cy) > this.cell * 0.5) {
      if (this.hoverIndex !== null) {
        this.hoverIndex = null;
        this.render();
        this.hoverHandler?.(null);
      }
      return;
    }

    const index = row * this.size + col;
    if (index !== this.hoverIndex) {
      this.hoverIndex = index;
      this.render();
      this.hoverHandler?.(index);
    }
  }

  private onPointerLeave(): void {
    if (this.hoverIndex !== null) {
      this.hoverIndex = null;
      this.render();
      this.hoverHandler?.(null);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.goban || !this.clickHandler) return;
    const { col, row } = this.canvasToCoord(event.offsetX, event.offsetY);
    if (col < 0 || col >= this.size || row < 0 || row >= this.size) return;
    const { x: cx, y: cy } = this.coordToCanvas(col, row);
    if (Math.hypot(event.offsetX - cx, event.offsetY - cy) > this.cell * 0.5) return;
    this.clickHandler(row * this.size + col);
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
  }
}
