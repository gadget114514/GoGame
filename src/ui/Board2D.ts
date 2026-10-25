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

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is not supported');
    this.ctx = context;
    window.addEventListener('resize', this.resize);
    canvas.addEventListener('pointerup', (event) => this.onPointerUp(event));
    canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    canvas.addEventListener('pointerleave', () => this.onPointerLeave());
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

    for (let i = 0; i < this.size; i++) {
      const pos = this.margin + i * this.cell;

      // Column letters (top and bottom)
      const letter = COORD_LETTERS[i] ?? '';
      const isColActive = i === lastCol;
      ctx.fillStyle = isColActive ? '#b45309' : 'rgba(65, 40, 18, 0.72)';
      ctx.font = isColActive
        ? `700 ${Math.max(11, this.cell * 0.36)}px "Segoe UI", system-ui, sans-serif`
        : `600 ${Math.max(10, this.cell * 0.3)}px "Segoe UI", system-ui, sans-serif`;

      ctx.fillText(letter, pos, this.margin - labelPad);
      ctx.fillText(letter, pos, this.margin + span + labelPad);

      // Row numbers (left and right)
      const numStr = String(this.size - i);
      const isRowActive = i === lastRow;
      ctx.fillStyle = isRowActive ? '#b45309' : 'rgba(65, 40, 18, 0.72)';
      ctx.font = isRowActive
        ? `700 ${Math.max(11, this.cell * 0.36)}px "Segoe UI", system-ui, sans-serif`
        : `600 ${Math.max(10, this.cell * 0.3)}px "Segoe UI", system-ui, sans-serif`;

      ctx.fillText(numStr, this.margin - labelPad, pos);
      ctx.fillText(numStr, this.margin + span + labelPad, pos);
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
      ctx.beginPath();
      ctx.arc(
        this.margin + col * this.cell,
        this.margin + row * this.cell,
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
        ctx.beginPath();
        ctx.arc(
          this.margin + col * this.cell,
          this.margin + row * this.cell,
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
      const x = this.margin + col * this.cell;
      const y = this.margin + row * this.cell;
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
      const gradient = ctx.createRadialGradient(
        x - radius * 0.3,
        y - radius * 0.3,
        radius * 0.15,
        x,
        y,
        radius
      );
      if (color === BLACK) {
        gradient.addColorStop(0, '#4a4a55');
        gradient.addColorStop(1, '#0a0a0e');
      } else {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#cfc8ba');
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = color === BLACK ? 'rgba(0,0,0,0.6)' : 'rgba(120,110,95,0.8)';
      ctx.lineWidth = Math.max(1, this.cell * 0.02);
      ctx.stroke();
    }

    // Last move marker.
    if (last !== null) {
      const row = Math.floor(last / this.size);
      const col = last % this.size;
      const color = this.goban?.board[last] ?? BLACK;
      const cx = this.margin + col * this.cell;
      const cy = this.margin + row * this.cell;

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
      const hx = this.margin + hCol * this.cell;
      const hy = this.margin + hRow * this.cell;
      ctx.beginPath();
      ctx.arc(hx, hy, radius * 0.88, 0, Math.PI * 2);
      ctx.fillStyle = this.goban.side === BLACK ? 'rgba(25, 25, 30, 0.45)' : 'rgba(255, 255, 255, 0.65)';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(1.5, this.cell * 0.04);
      ctx.stroke();
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.goban) return;
    const x = event.offsetX;
    const y = event.offsetY;
    const col = Math.round((x - this.margin) / this.cell);
    const row = Math.round((y - this.margin) / this.cell);
    if (col < 0 || col >= this.size || row < 0 || row >= this.size) {
      if (this.hoverIndex !== null) {
        this.hoverIndex = null;
        this.render();
        this.hoverHandler?.(null);
      }
      return;
    }
    const cx = this.margin + col * this.cell;
    const cy = this.margin + row * this.cell;
    if (Math.hypot(x - cx, y - cy) > this.cell * 0.5) {
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
    const x = event.offsetX;
    const y = event.offsetY;
    const col = Math.round((x - this.margin) / this.cell);
    const row = Math.round((y - this.margin) / this.cell);
    if (col < 0 || col >= this.size || row < 0 || row >= this.size) return;
    const cx = this.margin + col * this.cell;
    const cy = this.margin + row * this.cell;
    if (Math.hypot(x - cx, y - cy) > this.cell * 0.5) return;
    this.clickHandler(row * this.size + col);
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
  }
}
