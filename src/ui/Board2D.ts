import { BLACK, WHITE, type Goban } from '../game/Goban';
import type { Evaluation } from '../ai/KataGoEngine';
import { starPoints, COORD_LETTERS } from '../game/BoardSize';
import { heatColor } from './heatmap';
import { pieceRank } from './pieceRank';

export interface Board2DLayout {
  originX: number;
  originY: number;
  cell: number;
  span: number;
  pad: number;
  boardExtent: number;
}

export function computeBoard2DLayout(
  width: number,
  height: number,
  size: number
): Board2DLayout {
  const minDim = Math.min(width, height);
  const extent = minDim * 0.85;
  const cell = extent / Math.max(1, size - 1);
  const span = (size - 1) * cell;
  const pad = cell * 0.7;
  const originX = (width - span) / 2;
  const originY = (height - span) / 2;
  const boardExtent = span + pad * 2;
  return { originX, originY, cell, span, pad, boardExtent };
}

export function board2dCoordToCanvas(
  col: number,
  row: number,
  size: number,
  layout: Board2DLayout,
  perspective: 'black' | 'white'
): { x: number; y: number } {
  const drawCol = perspective === 'white' ? size - 1 - col : col;
  const drawRow = perspective === 'white' ? size - 1 - row : row;
  return {
    x: layout.originX + drawCol * layout.cell,
    y: layout.originY + drawRow * layout.cell
  };
}

export function board2dCanvasToCoord(
  canvasX: number,
  canvasY: number,
  size: number,
  layout: Board2DLayout,
  perspective: 'black' | 'white'
): { col: number; row: number } {
  const rawCol = Math.round((canvasX - layout.originX) / layout.cell);
  const rawRow = Math.round((canvasY - layout.originY) / layout.cell);
  const col = perspective === 'white' ? size - 1 - rawCol : rawCol;
  const row = perspective === 'white' ? size - 1 - rawRow : rawRow;
  return { col, row };
}

export class Board2D {
  private ctx: CanvasRenderingContext2D;
  private cssWidth = 1;
  private cssHeight = 1;
  private originX = 0;
  private originY = 0;
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
  private resizeObserver: ResizeObserver | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is not supported');
    this.ctx = context;
    window.addEventListener('resize', this.resize);
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement);
    }
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
    const layout = computeBoard2DLayout(this.cssWidth, this.cssHeight, this.size);
    this.originX = layout.originX;
    this.originY = layout.originY;
    this.cell = layout.cell;
  }

  private coordToCanvas(col: number, row: number): { x: number; y: number } {
    return board2dCoordToCanvas(
      col,
      row,
      this.size,
      {
        originX: this.originX,
        originY: this.originY,
        cell: this.cell,
        span: (this.size - 1) * this.cell,
        pad: this.cell * 0.7,
        boardExtent: (this.size - 1) * this.cell + this.cell * 1.4
      },
      this.perspective
    );
  }

  private canvasToCoord(canvasX: number, canvasY: number): { col: number; row: number } {
    return board2dCanvasToCoord(
      canvasX,
      canvasY,
      this.size,
      {
        originX: this.originX,
        originY: this.originY,
        cell: this.cell,
        span: (this.size - 1) * this.cell,
        pad: this.cell * 0.7,
        boardExtent: (this.size - 1) * this.cell + this.cell * 1.4
      },
      this.perspective
    );
  }

  private render(): void {
    const { ctx } = this;
    if (this.cssWidth <= 1) return;
    this.layout();

    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const span = (this.size - 1) * this.cell;
    const pad = this.cell * 0.7;
    const x0 = this.originX - pad;
    const y0 = this.originY - pad;
    const boardExtent = span + pad * 2;

    // Board drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.max(16, this.cell * 0.5);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(6, this.cell * 0.18);
    ctx.fillStyle = '#c99755';
    ctx.fillRect(x0, y0, boardExtent, boardExtent);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Board wood rim border
    ctx.strokeStyle = '#8a5e2f';
    ctx.lineWidth = Math.max(1.5, this.cell * 0.04);
    ctx.strokeRect(x0, y0, boardExtent, boardExtent);

    // Board Coordinates
    const last = this.goban?.lastMove ?? null;
    const lastCol = last !== null ? last % this.size : -1;
    const lastRow = last !== null ? Math.floor(last / this.size) : -1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelPad = Math.max(11, this.cell * 0.44);
    const isWhite = this.perspective === 'white';

    for (let i = 0; i < this.size; i++) {
      const posX = this.originX + i * this.cell;
      const posY = this.originY + i * this.cell;

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

      ctx.fillText(colStr, posX, this.originY - labelPad);
      ctx.fillText(colStr, posX, this.originY + span + labelPad);

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

      ctx.fillText(rowStr, this.originX - labelPad, posY);
      ctx.fillText(rowStr, this.originX + span + labelPad, posY);
    }

    // Grid.
    ctx.strokeStyle = 'rgba(60, 38, 18, 0.85)';
    ctx.lineWidth = Math.max(1, this.cell * 0.035);
    ctx.beginPath();
    for (let i = 0; i < this.size; i++) {
      const y = this.originY + i * this.cell;
      ctx.moveTo(this.originX, y);
      ctx.lineTo(this.originX + span, y);

      const x = this.originX + i * this.cell;
      ctx.moveTo(x, this.originY);
      ctx.lineTo(x, this.originY + span);
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

        // Radiate stardust sparkle particles while landing
        const count = 8;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + animProgress * 2.8;
          const dist = radius * (0.8 + 1.1 * animProgress);
          const px = x + Math.cos(angle) * dist;
          const py = y + Math.sin(angle) * dist;
          const pSize = Math.max(1.4, this.cell * 0.055 * (1 - animProgress));
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle =
            color === BLACK
              ? `rgba(245, 158, 11, ${rippleAlpha})`
              : `rgba(56, 189, 248, ${rippleAlpha})`;
          ctx.fill();
        }
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
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.resize);
  }
}
