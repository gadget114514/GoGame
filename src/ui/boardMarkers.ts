export interface BoardMarker {
  index: number;
  /** CSS hex color, e.g. `#3b82f6`. */
  color: string;
  /** Draw a brighter halo and pulse for best/worst answers. */
  emphasis?: boolean;
}

/** Maximum number of quiz candidates rendered at once. */
export const QUIZ_MARKER_LIMIT = 8;
