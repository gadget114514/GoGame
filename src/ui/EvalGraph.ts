import { t } from '../i18n';

export interface EvalPoint {
  moveNum: number;
  winrate: number; // 0.0 to 1.0 (Black winrate)
  scoreLead: number; // in points (positive = Black ahead)
  color?: number; // 1 = Black, 2 = White, 0 = initial
}

export type GraphMode = 'winrate' | 'lead';

export function calculateLeadBound(points: Iterable<EvalPoint>): number {
  let maxAbsLead = 0;
  for (const p of points) {
    if (Number.isFinite(p.scoreLead)) {
      maxAbsLead = Math.max(maxAbsLead, Math.abs(p.scoreLead));
    }
  }
  if (maxAbsLead <= 12) return 15;
  return Math.min(60, Math.ceil((maxAbsLead + 2) / 5) * 5);
}

export class EvalGraph {
  private readonly ctx: CanvasRenderingContext2D;
  private points = new Map<number, EvalPoint>();
  private totalMoves = 0;
  private currentStep = 0;
  private mode: GraphMode = 'winrate';
  private hoverMove: number | null = null;
  private onSelectMoveHandler: ((moveNum: number) => void) | null = null;
  private onVisibilityChangeHandler: ((visible: boolean) => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly panelEl: HTMLElement,
    private readonly infoEl: HTMLElement,
    private readonly modeBtn: HTMLButtonElement,
    private readonly closeBtn: HTMLButtonElement
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D context for EvalGraph canvas');
    this.ctx = context;

    this.initEvents();
  }

  private initEvents(): void {
    const handlePointer = (clientX: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const padLeft = 42;
      const plotW = rect.width - 42 - 18;
      if (plotW <= 0) return;
      const maxMove = Math.max(1, this.totalMoves, ...this.points.keys());
      const rawMove = Math.round(((x - padLeft) / plotW) * maxMove);
      const clampedMove = Math.max(0, Math.min(maxMove, rawMove));
      if (this.hoverMove !== clampedMove) {
        this.hoverMove = clampedMove;
        this.render();
      }
    };

    this.canvas.addEventListener('pointermove', (e) => handlePointer(e.clientX));
    this.canvas.addEventListener('pointerdown', (e) => handlePointer(e.clientX));
    this.canvas.addEventListener('pointerleave', () => {
      if (this.hoverMove !== null) {
        this.hoverMove = null;
        this.render();
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const padLeft = 42;
      const plotW = rect.width - 42 - 18;
      if (plotW <= 0) return;
      const maxMove = Math.max(1, this.totalMoves, ...this.points.keys());
      const rawMove = Math.round(((x - padLeft) / plotW) * maxMove);
      const targetMove = Math.max(0, Math.min(maxMove, rawMove));
      if (this.onSelectMoveHandler) {
        this.onSelectMoveHandler(targetMove);
      }
    });

    this.modeBtn.addEventListener('click', () => {
      this.toggleMode();
    });

    this.closeBtn.addEventListener('click', () => {
      this.setVisible(false);
      this.onVisibilityChangeHandler?.(false);
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.render();
      });
      this.resizeObserver.observe(this.panelEl);
    }
    window.addEventListener('resize', this.resize);
  }

  resize = (): void => {
    this.render();
  };

  onSelectMove(handler: (moveNum: number) => void): void {
    this.onSelectMoveHandler = handler;
  }

  onVisibilityChange(handler: (visible: boolean) => void): void {
    this.onVisibilityChangeHandler = handler;
  }

  setPoint(point: EvalPoint): void {
    this.points.set(point.moveNum, point);
    if (point.moveNum > this.totalMoves) {
      this.totalMoves = point.moveNum;
    }
    this.render();
  }

  setPoints(points: EvalPoint[], totalMoves?: number): void {
    this.points.clear();
    for (const p of points) {
      this.points.set(p.moveNum, p);
    }
    if (typeof totalMoves === 'number') {
      this.totalMoves = totalMoves;
    } else {
      this.totalMoves = Math.max(0, ...this.points.keys());
    }
    this.render();
  }

  pruneAfter(moveNum: number): void {
    for (const k of Array.from(this.points.keys())) {
      if (k > moveNum) {
        this.points.delete(k);
      }
    }
    this.totalMoves = Math.min(this.totalMoves, moveNum);
    this.render();
  }

  clear(): void {
    this.points.clear();
    this.totalMoves = 0;
    this.currentStep = 0;
    this.hoverMove = null;
    this.render();
  }

  setCurrentStep(step: number): void {
    this.currentStep = step;
    this.render();
  }

  setTotalMoves(total: number): void {
    this.totalMoves = Math.max(0, total);
    this.render();
  }

  getMode(): GraphMode {
    return this.mode;
  }

  setMode(mode: GraphMode): void {
    this.mode = mode;
    this.modeBtn.textContent = mode === 'winrate' ? t('evalGraphModeWinrate') : t('evalGraphModeLead');
    this.render();
  }

  toggleMode(): void {
    this.setMode(this.mode === 'winrate' ? 'lead' : 'winrate');
  }

  setVisible(visible: boolean): void {
    this.panelEl.hidden = !visible;
    if (visible) {
      this.render();
    }
  }

  isVisible(): boolean {
    return !this.panelEl.hidden;
  }

  updateLanguage(): void {
    this.modeBtn.textContent = this.mode === 'winrate' ? t('evalGraphModeWinrate') : t('evalGraphModeLead');
    this.updateInfoDisplay();
    this.render();
  }

  private updateInfoDisplay(): void {
    const activeMove = this.hoverMove !== null ? this.hoverMove : this.currentStep;
    const pt = this.points.get(activeMove);
    if (pt) {
      const winPct = (pt.winrate * 100).toFixed(1);
      const lead = pt.scoreLead;
      const leadStr =
        Math.abs(lead) < 0.05
          ? t('evalGraphEven')
          : `${lead > 0 ? t('blackWinShort') : t('whiteWinShort')} +${Math.abs(lead).toFixed(1)}`;
      const side = pt.winrate >= 0.5 ? t('blackWinShort') : t('whiteWinShort');
      this.infoEl.textContent = t('evalGraphTooltip', {
        move: activeMove,
        rate: winPct,
        side,
        lead: leadStr
      });
    } else {
      this.infoEl.textContent = t('evalGraphNoData', { move: activeMove });
    }
  }

  render(): void {
    if (this.panelEl.hidden) return;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    const { ctx } = this;
    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = rect.width;
    const cssH = rect.height;

    // Background
    ctx.fillStyle = '#16100b';
    ctx.fillRect(0, 0, cssW, cssH);

    const padLeft = 44;
    const padRight = 18;
    const padTop = 10;
    const padBottom = 18;
    const plotW = cssW - padLeft - padRight;
    const plotH = cssH - padTop - padBottom;

    if (plotW <= 10 || plotH <= 10) {
      ctx.restore();
      return;
    }

    const maxMove = Math.max(1, this.totalMoves, ...this.points.keys());
    const getX = (m: number) => padLeft + (m / maxMove) * plotW;

    const isWinrate = this.mode === 'winrate';
    const boundLead = isWinrate ? 0 : calculateLeadBound(this.points.values());

    const getY = (val: number) => {
      if (isWinrate) {
        const clamped = Math.max(0, Math.min(1, val));
        return padTop + (1 - clamped) * plotH;
      }
      const clamped = Math.max(-boundLead, Math.min(boundLead, val));
      return padTop + ((boundLead - clamped) / (2 * boundLead)) * plotH;
    };

    const yMid = isWinrate ? getY(0.5) : getY(0);

    // Grid lines & labels
    ctx.font = '10px "Segoe UI", -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#8f7762';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Top boundary line & label
    ctx.strokeStyle = 'rgba(80, 56, 38, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft + plotW, padTop);
    ctx.stroke();
    ctx.fillText(isWinrate ? '100%' : `+${boundLead}`, padLeft - 6, padTop + 2);

    // 75% guideline (or +boundLead/2)
    const yUpper = isWinrate ? getY(0.75) : getY(boundLead / 2);
    ctx.strokeStyle = 'rgba(80, 56, 38, 0.22)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yUpper);
    ctx.lineTo(padLeft + plotW, yUpper);
    ctx.stroke();
    ctx.fillText(isWinrate ? '75%' : `+${boundLead / 2}`, padLeft - 6, yUpper);

    // Midline (50% or 0)
    ctx.strokeStyle = '#8a623c';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yMid);
    ctx.lineTo(padLeft + plotW, yMid);
    ctx.stroke();
    ctx.fillStyle = '#d9a066';
    ctx.fillText(isWinrate ? '50%' : '0', padLeft - 6, yMid);
    ctx.fillStyle = '#8f7762';

    // 25% guideline (or -boundLead/2)
    const yLower = isWinrate ? getY(0.25) : getY(-boundLead / 2);
    ctx.strokeStyle = 'rgba(80, 56, 38, 0.22)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yLower);
    ctx.lineTo(padLeft + plotW, yLower);
    ctx.stroke();
    ctx.fillText(isWinrate ? '25%' : `-${boundLead / 2}`, padLeft - 6, yLower);

    // Bottom boundary line & label
    ctx.strokeStyle = 'rgba(80, 56, 38, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();
    ctx.fillText(isWinrate ? '0%' : `-${boundLead}`, padLeft - 6, padTop + plotH - 2);

    // Left axis line
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.stroke();

    // X-axis ticks & move numbers
    let tickStep = 5;
    if (maxMove > 200) tickStep = 50;
    else if (maxMove > 100) tickStep = 20;
    else if (maxMove > 50) tickStep = 10;
    else if (maxMove > 20) tickStep = 5;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#8f7762';
    for (let m = 0; m <= maxMove; m += tickStep) {
      const x = getX(m);
      ctx.beginPath();
      ctx.moveTo(x, padTop + plotH);
      ctx.lineTo(x, padTop + plotH + 3);
      ctx.stroke();
      ctx.fillText(String(m), x, padTop + plotH + 4);
    }

    // Sorted points
    const sorted = Array.from(this.points.values()).sort((a, b) => a.moveNum - b.moveNum);

    if (sorted.length > 0) {
      // Area Fill - Upper half (Black advantage)
      ctx.save();
      ctx.beginPath();
      ctx.rect(padLeft, padTop, plotW, yMid - padTop);
      ctx.clip();

      ctx.beginPath();
      ctx.moveTo(getX(sorted[0].moveNum), yMid);
      for (const p of sorted) {
        const val = isWinrate ? p.winrate : p.scoreLead;
        ctx.lineTo(getX(p.moveNum), getY(val));
      }
      ctx.lineTo(getX(sorted[sorted.length - 1].moveNum), yMid);
      ctx.closePath();

      const gradB = ctx.createLinearGradient(0, padTop, 0, yMid);
      gradB.addColorStop(0, 'rgba(217, 160, 102, 0.42)');
      gradB.addColorStop(1, 'rgba(217, 160, 102, 0.05)');
      ctx.fillStyle = gradB;
      ctx.fill();
      ctx.restore();

      // Area Fill - Lower half (White advantage)
      ctx.save();
      ctx.beginPath();
      ctx.rect(padLeft, yMid, plotW, padTop + plotH - yMid);
      ctx.clip();

      ctx.beginPath();
      ctx.moveTo(getX(sorted[0].moveNum), yMid);
      for (const p of sorted) {
        const val = isWinrate ? p.winrate : p.scoreLead;
        ctx.lineTo(getX(p.moveNum), getY(val));
      }
      ctx.lineTo(getX(sorted[sorted.length - 1].moveNum), yMid);
      ctx.closePath();

      const gradW = ctx.createLinearGradient(0, yMid, 0, padTop + plotH);
      gradW.addColorStop(0, 'rgba(180, 200, 225, 0.05)');
      gradW.addColorStop(1, 'rgba(180, 200, 225, 0.32)');
      ctx.fillStyle = gradW;
      ctx.fill();
      ctx.restore();

      // Curve Line
      ctx.beginPath();
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        const val = isWinrate ? p.winrate : p.scoreLead;
        const x = getX(p.moveNum);
        const y = getY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#d9a066';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Data point dots (if reasonable number of moves)
      if (sorted.length <= 100) {
        for (const p of sorted) {
          const val = isWinrate ? p.winrate : p.scoreLead;
          const x = getX(p.moveNum);
          const y = getY(val);
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = (isWinrate ? p.winrate >= 0.5 : p.scoreLead >= 0) ? '#d9a066' : '#cbd5e1';
          ctx.fill();
        }
      }
    }

    // Hover Indicator
    if (this.hoverMove !== null && this.hoverMove !== this.currentStep) {
      const hovX = getX(this.hoverMove);
      ctx.beginPath();
      ctx.moveTo(hovX, padTop);
      ctx.lineTo(hovX, padTop + plotH);
      ctx.strokeStyle = 'rgba(255, 230, 180, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const hovPoint = this.points.get(this.hoverMove);
      if (hovPoint) {
        const val = isWinrate ? hovPoint.winrate : hovPoint.scoreLead;
        const hovY = getY(val);
        ctx.beginPath();
        ctx.arc(hovX, hovY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffe4b5';
        ctx.fill();
      }
    }

    // Current Step Cursor
    if (this.currentStep <= maxMove) {
      const curX = getX(this.currentStep);
      ctx.beginPath();
      ctx.moveTo(curX, padTop);
      ctx.lineTo(curX, padTop + plotH);
      ctx.strokeStyle = 'rgba(245, 240, 230, 0.85)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      const curPoint = this.points.get(this.currentStep);
      if (curPoint) {
        const val = isWinrate ? curPoint.winrate : curPoint.scoreLead;
        const curY = getY(val);
        ctx.save();
        ctx.shadowColor = '#d9a066';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(curX, curY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
    this.updateInfoDisplay();
  }

  dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.resize);
  }
}
