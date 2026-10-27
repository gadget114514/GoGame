import { BLACK, WHITE, type Goban, type Player } from './Goban';

export interface TwoEyeGroup {
  color: Player;
  stones: number[];
  eyes: number[];
  falseEyes: number[];
  pair: [number, number];
}

export interface EyeAnalysis {
  groups: TwoEyeGroup[];
  eyeOwner: Map<number, Player>;
  falseEyeOwner: Map<number, Player>;
}

const ORTHOGONAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
] as const;

const DIAGONAL = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
] as const;

function eyeUncontrolledDiagonals(
  goban: Goban,
  index: number,
  color: Player,
  groupMask?: Uint8Array
): number | null {
  if (goban.board[index] !== 0) return null;

  const n = goban.size;
  const row = Math.floor(index / n);
  const col = index % n;

  for (const [dr, dc] of ORTHOGONAL) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= n || c < 0 || c >= n) continue;
    const neighbor = r * n + c;
    if (goban.board[neighbor] !== color) return null;
    if (groupMask && groupMask[neighbor] !== 1) return null;
  }

  let uncontrolled = 0;
  for (const [dr, dc] of DIAGONAL) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= n || c < 0 || c >= n) continue;
    if (goban.board[r * n + c] !== color) uncontrolled++;
  }

  return uncontrolled;
}

export function isTrueEye(goban: Goban, index: number, color: Player): boolean {
  const uncontrolled = eyeUncontrolledDiagonals(goban, index, color);
  return uncontrolled !== null && uncontrolled <= 1;
}

function closestPair(eyes: number[], size: number): [number, number] {
  let best: [number, number] = [eyes[0], eyes[1]];
  let bestDistance = Infinity;

  for (let i = 0; i < eyes.length - 1; i++) {
    const a = eyes[i];
    const ar = Math.floor(a / size);
    const ac = a % size;
    for (let j = i + 1; j < eyes.length; j++) {
      const b = eyes[j];
      const distance =
        Math.abs(ar - Math.floor(b / size)) + Math.abs(ac - (b % size));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = [a, b];
      }
    }
  }

  return best;
}

export function detectTwoEyes(goban: Goban): EyeAnalysis {
  const groups: TwoEyeGroup[] = [];
  const eyeOwner = new Map<number, Player>();
  const falseEyeOwner = new Map<number, Player>();
  const seen = new Uint8Array(goban.area);

  for (let index = 0; index < goban.area; index++) {
    const color = goban.board[index];
    if ((color !== BLACK && color !== WHITE) || seen[index]) continue;

    const group = goban.groupAt(index);
    for (const stone of group.stones) seen[stone] = 1;

    const groupMask = new Uint8Array(goban.area);
    for (const stone of group.stones) groupMask[stone] = 1;

    const eyes: number[] = [];
    const falseEyes: number[] = [];
    for (const liberty of group.liberties) {
      const uncontrolled = eyeUncontrolledDiagonals(
        goban,
        liberty,
        color as Player,
        groupMask
      );
      if (uncontrolled === null) continue;
      if (uncontrolled <= 1) eyes.push(liberty);
      else falseEyes.push(liberty);
    }

    eyes.sort((a, b) => a - b);
    falseEyes.sort((a, b) => a - b);

    const functionalEyes = [...eyes, ...falseEyes].sort((a, b) => a - b);
    if (functionalEyes.length < 2) continue;

    for (const eye of eyes) eyeOwner.set(eye, color as Player);
    for (const eye of falseEyes) falseEyeOwner.set(eye, color as Player);
    const pairEyes = eyes.length >= 2 ? eyes : functionalEyes;
    groups.push({
      color: color as Player,
      stones: group.stones,
      eyes,
      falseEyes,
      pair: closestPair(pairEyes, goban.size)
    });
  }

  return { groups, eyeOwner, falseEyeOwner };
}
