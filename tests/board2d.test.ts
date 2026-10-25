import { describe, expect, it } from 'vitest';
import {
  computeBoard2DLayout,
  board2dCoordToCanvas,
  board2dCanvasToCoord
} from '../src/ui/Board2D';

describe('Board2D centering and coordinate transforms', () => {
  it('centers the board on widescreen displays', () => {
    const width = 1920;
    const height = 1080;
    const size = 19;
    const layout = computeBoard2DLayout(width, height, size);

    // Center of grid lines
    const gridCenterX = layout.originX + layout.span / 2;
    const gridCenterY = layout.originY + layout.span / 2;
    expect(gridCenterX).toBeCloseTo(width / 2, 5);
    expect(gridCenterY).toBeCloseTo(height / 2, 5);

    // Center of wooden board background rect
    const boardLeft = layout.originX - layout.pad;
    const boardTop = layout.originY - layout.pad;
    const boardCenterX = boardLeft + layout.boardExtent / 2;
    const boardCenterY = boardTop + layout.boardExtent / 2;
    expect(boardCenterX).toBeCloseTo(width / 2, 5);
    expect(boardCenterY).toBeCloseTo(height / 2, 5);
  });

  it('centers the board on portrait displays', () => {
    const width = 600;
    const height = 1000;
    const size = 19;
    const layout = computeBoard2DLayout(width, height, size);

    const gridCenterX = layout.originX + layout.span / 2;
    const gridCenterY = layout.originY + layout.span / 2;
    expect(gridCenterX).toBeCloseTo(width / 2, 5);
    expect(gridCenterY).toBeCloseTo(height / 2, 5);
  });

  it('centers the board on square displays', () => {
    const width = 800;
    const height = 800;
    const size = 19;
    const layout = computeBoard2DLayout(width, height, size);

    expect(layout.originX + layout.span / 2).toBeCloseTo(400, 5);
    expect(layout.originY + layout.span / 2).toBeCloseTo(400, 5);
    expect(layout.originX).toBeCloseTo(layout.originY, 5);
  });

  it('accurately transforms coordinates for Black perspective (top-left is 0,0)', () => {
    const layout = computeBoard2DLayout(1200, 800, 19);

    const origin = board2dCoordToCanvas(0, 0, 19, layout, 'black');
    expect(origin.x).toBeCloseTo(layout.originX, 5);
    expect(origin.y).toBeCloseTo(layout.originY, 5);

    const corner = board2dCoordToCanvas(18, 18, 19, layout, 'black');
    expect(corner.x).toBeCloseTo(layout.originX + layout.span, 5);
    expect(corner.y).toBeCloseTo(layout.originY + layout.span, 5);

    expect(board2dCanvasToCoord(origin.x, origin.y, 19, layout, 'black')).toEqual({ col: 0, row: 0 });
    expect(board2dCanvasToCoord(corner.x, corner.y, 19, layout, 'black')).toEqual({ col: 18, row: 18 });
  });

  it('accurately transforms coordinates for White perspective (rotated 180 degrees)', () => {
    const layout = computeBoard2DLayout(1200, 800, 19);

    const origin = board2dCoordToCanvas(0, 0, 19, layout, 'white');
    // For white, (0,0) is drawn at the bottom-right of the screen
    expect(origin.x).toBeCloseTo(layout.originX + layout.span, 5);
    expect(origin.y).toBeCloseTo(layout.originY + layout.span, 5);

    const corner = board2dCoordToCanvas(18, 18, 19, layout, 'white');
    // (18,18) is drawn at the top-left of the screen
    expect(corner.x).toBeCloseTo(layout.originX, 5);
    expect(corner.y).toBeCloseTo(layout.originY, 5);

    expect(board2dCanvasToCoord(origin.x, origin.y, 19, layout, 'white')).toEqual({ col: 0, row: 0 });
    expect(board2dCanvasToCoord(corner.x, corner.y, 19, layout, 'white')).toEqual({ col: 18, row: 18 });
  });

  it('works correctly for 9x9 and 13x13 boards', () => {
    for (const size of [9, 13, 19]) {
      const layout = computeBoard2DLayout(1000, 700, size);
      expect(layout.originX + layout.span / 2).toBeCloseTo(500, 5);
      expect(layout.originY + layout.span / 2).toBeCloseTo(350, 5);
    }
  });
});
