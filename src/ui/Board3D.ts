import {
  Animation,
  ArcRotateCamera,
  Color3,
  Color4,
  CubicEase,
  DirectionalLight,
  DynamicTexture,
  EasingFunction,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AssetContainer,
  type Node
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { BLACK, WHITE, type Goban } from '../game/Goban';
import { starPoints, COORD_LETTERS, type BoardSize } from '../game/BoardSize';
import type { Evaluation } from '../ai/KataGoEngine';
import { heatColor } from './heatmap';
import { pieceRank } from './pieceRank';

export type PieceStyle = 'clayfoot' | 'dark-yagami' | 'stones';

export interface RenderState {
  goban: Goban;
  evaluation: Evaluation | null;
  moveWeights: Map<number, number>;
}

interface PieceHandle {
  root: TransformNode;
  rank: number;
  color: number;
  dead: boolean;
}

const PIECE_FILES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const;
type PieceFile = (typeof PIECE_FILES)[number];

const SPACING = 1;
const TEXTURE_SIZE = 1024;
const BLACK_MOVE_COLOR = new Color3(1.0, 0.58, 0.12);
const WHITE_MOVE_COLOR = new Color3(0.12, 0.78, 1.0);

export class Board3D {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;

  private woodMaterial: StandardMaterial;
  private starMaterial: StandardMaterial;
  private blackMaterial: StandardMaterial;
  private whiteMaterial: StandardMaterial;

  private boardNodes: Node[] = [];
  private boardMesh: Mesh | null = null;
  private heatPlane: Mesh | null = null;
  private heatTexture: DynamicTexture | null = null;
  private coordPlane: Mesh | null = null;
  private coordTexture: DynamicTexture | null = null;

  private currentStyle: PieceStyle = 'clayfoot';
  private perspective: 'black' | 'white' = 'black';
  private directional: DirectionalLight;
  private styleContainers = new Map<PieceStyle, Map<PieceFile, AssetContainer>>();
  private styleScales = new Map<PieceStyle, number>();
  private pieces = new Map<number, PieceHandle>();
  private fallback = false;
  private lastState: RenderState | null = null;

  private particleTexture: DynamicTexture;
  private lastMoveMaterial: StandardMaterial;
  private lastMoveGlowMaterial: StandardMaterial;
  private lastMoveRing: Mesh;
  private lastMoveGlow: Mesh;
  private lastMoveBeacon: Mesh;
  private lastMovePillar: Mesh;
  private lastMoveNumber = -1;
  private lastMovePulseAt = 0;
  private effectSeed = 0;

  private hoverMarker: Mesh;
  private hoverHandler: ((index: number | null) => void) | null = null;
  private size: BoardSize = 19;
  private clickHandler: ((index: number) => void) | null = null;

  ready = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.055, 0.045, 0.035, 1);

    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      0.82,
      26,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 9;
    this.camera.upperRadiusLimit = 90;
    this.camera.lowerBetaLimit = 0.18;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.04;
    this.camera.wheelDeltaPercentage = 0.02;
    this.camera.panningSensibility = 0;
    this.camera.minZ = 0.1;

    const hemi = new HemisphericLight('hemi', new Vector3(0.25, 1, 0.35), this.scene);
    hemi.intensity = 0.9;
    hemi.groundColor = new Color3(0.16, 0.11, 0.07);

    const directional = new DirectionalLight('directional', new Vector3(-0.35, -1, 0.45), this.scene);
    directional.intensity = 0.75;
    directional.position = new Vector3(10, 24, -14);
    this.directional = directional;

    this.woodMaterial = new StandardMaterial('wood', this.scene);
    this.woodMaterial.diffuseColor = new Color3(0.74, 0.5, 0.27);
    this.woodMaterial.specularColor = new Color3(0.08, 0.06, 0.04);
    this.woodMaterial.specularPower = 24;
    this.woodMaterial.emissiveColor = new Color3(0.03, 0.02, 0.01);

    this.starMaterial = new StandardMaterial('star', this.scene);
    this.starMaterial.diffuseColor = new Color3(0.11, 0.075, 0.045);
    this.starMaterial.specularColor = Color3.Black();

    this.blackMaterial = new StandardMaterial('stone-black', this.scene);
    this.blackMaterial.diffuseColor = new Color3(0.045, 0.045, 0.06);
    this.blackMaterial.specularColor = new Color3(0.55, 0.55, 0.62);
    this.blackMaterial.specularPower = 72;
    this.blackMaterial.emissiveColor = new Color3(0.012, 0.012, 0.02);

    this.whiteMaterial = new StandardMaterial('stone-white', this.scene);
    this.whiteMaterial.diffuseColor = new Color3(0.93, 0.9, 0.84);
    this.whiteMaterial.specularColor = new Color3(0.6, 0.6, 0.6);
    this.whiteMaterial.specularPower = 56;
    this.whiteMaterial.emissiveColor = new Color3(0.05, 0.048, 0.045);

    this.particleTexture = new DynamicTexture(
      'particle-texture',
      { width: 64, height: 64 },
      this.scene,
      false
    );
    const particleContext = this.particleTexture.getContext();
    const particleGradient = particleContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    particleGradient.addColorStop(0, 'rgba(255,255,255,1)');
    particleGradient.addColorStop(0.35, 'rgba(255,255,255,0.9)');
    particleGradient.addColorStop(1, 'rgba(255,255,255,0)');
    particleContext.fillStyle = particleGradient;
    particleContext.fillRect(0, 0, 64, 64);
    this.particleTexture.hasAlpha = true;
    this.particleTexture.update(false);

    this.lastMoveMaterial = new StandardMaterial('last-move-material', this.scene);
    this.lastMoveMaterial.diffuseColor = Color3.Black();
    this.lastMoveMaterial.emissiveColor = BLACK_MOVE_COLOR;
    this.lastMoveMaterial.specularColor = Color3.Black();
    this.lastMoveMaterial.disableLighting = true;
    this.lastMoveMaterial.alpha = 0.9;
    this.lastMoveMaterial.backFaceCulling = false;

    this.lastMoveGlowMaterial = new StandardMaterial('last-move-glow-material', this.scene);
    this.lastMoveGlowMaterial.diffuseColor = Color3.Black();
    this.lastMoveGlowMaterial.emissiveColor = BLACK_MOVE_COLOR;
    this.lastMoveGlowMaterial.specularColor = Color3.Black();
    this.lastMoveGlowMaterial.disableLighting = true;
    this.lastMoveGlowMaterial.alpha = 0.18;
    this.lastMoveGlowMaterial.backFaceCulling = false;

    const ring = MeshBuilder.CreateTorus(
      'last-move-ring',
      { diameter: 1.02, thickness: 0.058, tessellation: 48 },
      this.scene
    );
    ring.material = this.lastMoveMaterial;
    ring.isPickable = false;
    ring.isVisible = false;
    this.lastMoveRing = ring;

    const glow = MeshBuilder.CreateDisc(
      'last-move-glow',
      { radius: 0.58, tessellation: 48 },
      this.scene
    );
    glow.rotation.x = -Math.PI / 2;
    glow.material = this.lastMoveGlowMaterial;
    glow.isPickable = false;
    glow.isVisible = false;
    this.lastMoveGlow = glow;

    const beacon = MeshBuilder.CreatePolyhedron(
      'last-move-beacon',
      { type: 1, size: 0.18 },
      this.scene
    );
    beacon.material = this.lastMoveMaterial;
    beacon.isPickable = false;
    beacon.isVisible = false;
    this.lastMoveBeacon = beacon;

    const pillar = MeshBuilder.CreateCylinder(
      'last-move-pillar',
      { height: 1.40, diameter: 0.05, tessellation: 12 },
      this.scene
    );
    pillar.material = this.lastMoveGlowMaterial;
    pillar.isPickable = false;
    pillar.isVisible = false;
    this.lastMovePillar = pillar;

    const hoverMat = new StandardMaterial('hover-preview-mat', this.scene);
    hoverMat.diffuseColor = Color3.Black();
    hoverMat.emissiveColor = new Color3(1.0, 0.82, 0.25);
    hoverMat.disableLighting = true;
    hoverMat.alpha = 0.5;
    hoverMat.backFaceCulling = false;

    const hoverRing = MeshBuilder.CreateTorus(
      'hover-preview-ring',
      { diameter: 0.92, thickness: 0.045, tessellation: 36 },
      this.scene
    );
    hoverRing.material = hoverMat;
    hoverRing.isPickable = false;
    hoverRing.isVisible = false;
    this.hoverMarker = hoverRing;

    this.scene.onBeforeRenderObservable.add(() => this.animateLastMoveMarker());

    this.attachPointer();
    window.addEventListener('resize', this.resize);
    this.engine.runRenderLoop(() => this.scene.render());

    void this.setPieceStyle('clayfoot');
  }

  setPerspective(side: 'black' | 'white'): void {
    if (this.perspective === side) return;
    this.perspective = side;
    const targetAlpha = side === 'white' ? Math.PI / 2 : -Math.PI / 2;
    this.camera.alpha = targetAlpha;

    if (this.coordPlane) {
      this.coordPlane.rotation.y = side === 'white' ? Math.PI : 0;
    }
    if (this.heatPlane) {
      this.heatPlane.rotation.y = side === 'white' ? Math.PI : 0;
    }
    if (this.directional) {
      if (side === 'white') {
        this.directional.position.set(-10, 24, 14);
        this.directional.direction.set(0.35, -1, -0.45);
      } else {
        this.directional.position.set(10, 24, -14);
        this.directional.direction.set(-0.35, -1, 0.45);
      }
    }
    if (this.lastState) {
      this.update(this.lastState);
    } else {
      this.drawCoordinates(null);
    }
  }

  async setPieceStyle(style: PieceStyle): Promise<void> {
    if (this.currentStyle === style && this.ready && (style === 'stones' || this.styleContainers.has(style))) {
      return;
    }
    this.currentStyle = style;
    if (style !== 'stones') {
      await this.ensureStyleLoaded(style);
    }
    this.ready = true;
    this.pieces.forEach((piece) => piece.root.dispose());
    this.pieces.clear();
    if (this.lastState) {
      this.syncPieces(this.lastState);
    }
  }

  private async ensureStyleLoaded(style: PieceStyle): Promise<void> {
    if (this.styleContainers.has(style) || style === 'stones') return;
    const base = import.meta.env.BASE_URL || './';
    const baseUrl = base.endsWith('/') ? base : `${base}/`;
    const folder = style === 'clayfoot' ? 'assets/chess/clayfoot/' : 'assets/chess/dark-yagami/';
    const root = `${baseUrl}${folder}`;
    const fallbackRoot = `${baseUrl}assets/chess/`;

    const containers = new Map<PieceFile, AssetContainer>();
    try {
      for (const file of PIECE_FILES) {
        let container: AssetContainer;
        try {
          container = await SceneLoader.LoadAssetContainerAsync(
            root,
            `${file}.glb`,
            this.scene
          );
        } catch {
          container = await SceneLoader.LoadAssetContainerAsync(
            fallbackRoot,
            `${file}.glb`,
            this.scene
          );
        }
        containers.set(file, container);
      }

      // Compute uniform scale so Queen is ~1.05 high
      const queenContainer = containers.get('queen');
      let setScale = 1.0;
      if (queenContainer) {
        const qEntries = queenContainer.instantiateModelsToScene(undefined, false);
        const qRoot = qEntries.rootNodes[0] as TransformNode;
        const { min, max } = qRoot.getHierarchyBoundingVectors(true);
        const qHeight = max.y - min.y;
        if (qHeight > 0) {
          setScale = 1.05 / qHeight;
        }
        qEntries.rootNodes.forEach((n) => n.dispose());
      }
      this.styleScales.set(style, setScale);
      this.styleContainers.set(style, containers);
    } catch (error) {
      console.warn(`Failed loading piece style [${style}], using fallback.`, error);
      this.fallback = true;
    }
  }

  setOnIntersectionClick(handler: (index: number) => void): void {
    this.clickHandler = handler;
  }

  setOnIntersectionHover(handler: (index: number | null) => void): void {
    this.hoverHandler = handler;
  }

  get pieceCount(): number {
    return this.pieces.size;
  }

  setBoardSize(size: BoardSize): void {
    this.size = size;
    for (const node of this.boardNodes) node.dispose();
    this.boardNodes = [];
    this.boardMesh = null;
    this.heatPlane = null;
    this.heatTexture = null;
    this.coordPlane = null;
    this.coordTexture = null;
    this.pieces.forEach((piece) => piece.root.dispose());
    this.pieces.clear();
    this.buildBoard();
  }

  private buildBoard(): void {
    const n = this.size;
    const span = (n - 1) * SPACING;
    const planeWidth = n * SPACING;
    const half = span / 2;

    const board = MeshBuilder.CreateBox(
      'board',
      { width: planeWidth + 0.9, depth: planeWidth + 0.9, height: 0.4 },
      this.scene
    );
    board.position.y = -0.2;
    board.material = this.woodMaterial;
    board.isPickable = true;
    this.boardNodes.push(board);
    this.boardMesh = board;

    const lines: Vector3[][] = [];
    for (let i = 0; i < n; i++) {
      const offset = -half + i * SPACING;
      lines.push([new Vector3(-half, 0.012, offset), new Vector3(half, 0.012, offset)]);
      lines.push([new Vector3(offset, 0.012, -half), new Vector3(offset, 0.012, half)]);
    }
    const grid = MeshBuilder.CreateLineSystem('grid', { lines }, this.scene);
    grid.color = new Color3(0.13, 0.085, 0.045);
    grid.isPickable = false;
    this.boardNodes.push(grid);

    for (const index of starPoints(this.size)) {
      const row = Math.floor(index / n);
      const col = index % n;
      const star = MeshBuilder.CreateDisc(
        'star',
        { radius: 0.055, tessellation: 18 },
        this.scene
      );
      star.rotation.x = -Math.PI / 2;
      star.position.set(this.worldCoordinateX(col), 0.02, this.worldCoordinateZ(row));
      star.material = this.starMaterial;
      star.isPickable = false;
      this.boardNodes.push(star);
    }

    const texture = new DynamicTexture(
      'heat',
      { width: TEXTURE_SIZE, height: TEXTURE_SIZE },
      this.scene,
      false
    );
    texture.hasAlpha = true;
    const context = texture.getContext();
    context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    texture.update(false);
    this.heatTexture = texture;

    const heatMaterial = new StandardMaterial('heat-material', this.scene);
    heatMaterial.diffuseTexture = texture;
    heatMaterial.emissiveTexture = texture;
    heatMaterial.useAlphaFromDiffuseTexture = true;
    heatMaterial.diffuseColor = new Color3(1, 1, 1);
    heatMaterial.emissiveColor = new Color3(0.65, 0.65, 0.65);
    heatMaterial.specularColor = Color3.Black();
    heatMaterial.backFaceCulling = false;
    heatMaterial.alpha = 0.9;

    const plane = MeshBuilder.CreatePlane(
      'heat-plane',
      { width: planeWidth, height: planeWidth, sideOrientation: Mesh.DOUBLESIDE },
      this.scene
    );
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.y = this.perspective === 'white' ? Math.PI : 0;
    plane.position.y = 0.024;
    plane.material = heatMaterial;
    plane.isPickable = false;
    plane.alphaIndex = 1;
    this.boardNodes.push(plane);
    this.heatPlane = plane;

    // Coordinate border overlay
    const coordPlaneSize = planeWidth + 0.88;
    const coordTexture = new DynamicTexture(
      'board-coords',
      { width: TEXTURE_SIZE, height: TEXTURE_SIZE },
      this.scene,
      false
    );
    coordTexture.hasAlpha = true;
    this.coordTexture = coordTexture;

    const coordMaterial = new StandardMaterial('coord-material', this.scene);
    coordMaterial.diffuseTexture = coordTexture;
    coordMaterial.emissiveTexture = coordTexture;
    coordMaterial.useAlphaFromDiffuseTexture = true;
    coordMaterial.diffuseColor = new Color3(1, 1, 1);
    coordMaterial.emissiveColor = new Color3(1, 1, 1);
    coordMaterial.specularColor = Color3.Black();
    coordMaterial.disableLighting = true;
    coordMaterial.backFaceCulling = false;

    const coordPlane = MeshBuilder.CreatePlane(
      'coord-plane',
      { width: coordPlaneSize, height: coordPlaneSize, sideOrientation: Mesh.DOUBLESIDE },
      this.scene
    );
    coordPlane.rotation.x = -Math.PI / 2;
    coordPlane.rotation.y = this.perspective === 'white' ? Math.PI : 0;
    coordPlane.position.y = 0.016;
    coordPlane.material = coordMaterial;
    coordPlane.isPickable = false;
    this.boardNodes.push(coordPlane);
    this.coordPlane = coordPlane;

    this.drawCoordinates(null);

    this.camera.radius = Math.max(14, n * 1.75);
    this.camera.lowerRadiusLimit = Math.max(8, n * 0.75);
    this.camera.upperRadiusLimit = Math.max(24, n * 4);
    this.camera.setTarget(Vector3.Zero());
  }

  update(state: RenderState): void {
    this.lastState = state;
    if (!this.ready) return;
    if (state.goban.size !== this.size) this.setBoardSize(state.goban.size);
    this.updateHeat(state);
    this.syncPieces(state);
  }

  private updateHeat(state: RenderState): void {
    const texture = this.heatTexture;
    if (!texture) return;
    const context = texture.getContext();
    const n = this.size;
    const cell = TEXTURE_SIZE / n;
    context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    const ownership = state.evaluation?.ownership;
    const isWhite = this.perspective === 'white';
    if (ownership && ownership.length >= n * n) {
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const value = ownership[row * n + col];
          const [r, g, b, a] = heatColor(value);
          const drawCol = isWhite ? n - 1 - col : col;
          const drawRow = isWhite ? n - 1 - row : row;
          const x = (drawCol + 0.5) * cell;
          const y = (drawRow + 0.5) * cell;
          context.beginPath();
          context.arc(x, y, cell * 0.42, 0, Math.PI * 2);
          context.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
          context.fill();
        }
      }
    }
    texture.update(false);
  }

  private syncPieces(state: RenderState): void {
    const { goban } = state;
    const n = goban.size;
    const moveDelta = this.lastMoveNumber < 0 ? 0 : goban.moveNumber - this.lastMoveNumber;
    const isNewMove = moveDelta === 1;

    for (let index = 0; index < n * n; index++) {
      const color = goban.board[index];
      const existing = this.pieces.get(index);

      if (color === BLACK || color === WHITE) {
        const { rank, dead } = this.rankFor(index, color, state);
        if (
          !existing ||
          existing.color !== color ||
          existing.rank !== rank ||
          existing.dead !== dead
        ) {
          const wasExisting = !!existing;
          existing?.root.dispose();
          const root = this.createPieceNode(rank, color, index, dead);
          const row = Math.floor(index / n);
          const col = index % n;
          const targetX = this.worldCoordinateX(col);
          const targetZ = this.worldCoordinateZ(row);
          const targetY = 0.03;
          root.position.set(targetX, targetY, targetZ);

          const isJustPlaced = isNewMove && index === state.goban.lastMove && !wasExisting;
          if (isJustPlaced) {
            this.animatePlacement(root, targetY, color, () => {
              const pieceColor = color === WHITE ? WHITE_MOVE_COLOR : BLACK_MOVE_COLOR;
              this.spawnBurst(new Vector3(targetX, 0.16, targetZ), pieceColor, 54, 2.8);
              this.spawnShockwave(new Vector3(targetX, 0.04, targetZ), pieceColor);
              this.lastMovePulseAt = performance.now();
            });
          }

          this.pieces.set(index, { root, rank, color, dead });
        }
      } else if (existing) {
        if (isNewMove) this.explodePiece(existing);
        else existing.root.dispose();
        this.pieces.delete(index);
      }
    }

    this.updateLastMoveMarker(state, isNewMove);
    this.lastMoveNumber = goban.moveNumber;
  }

  private rankFor(index: number, color: number, state: RenderState): { rank: number; dead: boolean } {
    const ownership = state.evaluation?.ownership[index] ?? 0;
    return pieceRank(ownership, color, index === state.goban.lastMove);
  }

  private updateLastMoveMarker(state: RenderState, isNewMove: boolean): void {
    const last = state.goban.lastMove;
    this.drawCoordinates(last);

    if (last === null) {
      this.lastMoveRing.isVisible = false;
      this.lastMoveGlow.isVisible = false;
      this.lastMoveBeacon.isVisible = false;
      this.lastMovePillar.isVisible = false;
      return;
    }

    const n = state.goban.size;
    const row = Math.floor(last / n);
    const col = last % n;
    const x = this.worldCoordinateX(col);
    const z = this.worldCoordinateZ(row);
    const color = state.goban.board[last] === WHITE ? WHITE_MOVE_COLOR : BLACK_MOVE_COLOR;

    this.lastMoveMaterial.emissiveColor.copyFrom(color);
    this.lastMoveGlowMaterial.emissiveColor.copyFrom(color);
    this.lastMoveRing.position.set(x, 0.05, z);
    this.lastMoveGlow.position.set(x, 0.035, z);
    this.lastMoveRing.isVisible = true;
    this.lastMoveGlow.isVisible = true;

    const beaconBaseY = 1.48;
    this.lastMoveBeacon.position.set(x, beaconBaseY, z);
    this.lastMoveBeacon.isVisible = true;

    this.lastMovePillar.position.set(x, beaconBaseY / 2, z);
    this.lastMovePillar.isVisible = true;

    if (isNewMove) {
      this.lastMovePulseAt = performance.now();
    }
  }

  private drawCoordinates(lastMove: number | null): void {
    const texture = this.coordTexture;
    if (!texture) return;
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    const size = TEXTURE_SIZE;
    ctx.clearRect(0, 0, size, size);

    const n = this.size;
    const span = (n - 1) * SPACING;
    const coordPlaneSize = n * SPACING + 0.88;
    const gridExtent = (span / coordPlaneSize) * size;
    const center = size / 2;

    const lastCol = lastMove !== null ? lastMove % n : -1;
    const lastRow = lastMove !== null ? Math.floor(lastMove / n) : -1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const pad = Math.max(18, (size - gridExtent) / 3.0);
    const isWhite = this.perspective === 'white';

    for (let i = 0; i < n; i++) {
      const frac = n > 1 ? i / (n - 1) - 0.5 : 0;
      const pos = center + frac * gridExtent;

      // Column labels (top and bottom border)
      // For Black: Left is 1, Right is n (Top-Left is 1,1; Bottom-Right is n,n)
      // For White: Left is n, Right is 1 (Screen Top-Left is n,n; Bottom-Right is 1,1)
      const colNum = isWhite ? n - i : i + 1;
      const colStr = String(colNum);
      const actualCol = isWhite ? n - 1 - i : i;
      const isColActive = actualCol === lastCol;

      ctx.fillStyle = isColActive ? '#d97706' : '#221408';
      ctx.font = isColActive
        ? `bold ${Math.max(16, Math.round(28 * (19 / n)))}px "Segoe UI", -apple-system, system-ui, sans-serif`
        : `700 ${Math.max(14, Math.round(24 * (19 / n)))}px "Segoe UI", -apple-system, system-ui, sans-serif`;

      ctx.fillText(colStr, pos, center - gridExtent / 2 - pad);
      ctx.fillText(colStr, pos, center + gridExtent / 2 + pad);

      // Row labels (left and right border)
      // For Black: Top is 1, Bottom is n (Top-Left is 1,1; Bottom-Right is n,n)
      // For White: Top is n, Bottom is 1 (Screen Top-Left is n,n; Bottom-Right is 1,1)
      const rowNum = isWhite ? n - i : i + 1;
      const rowStr = String(rowNum);
      const actualRow = isWhite ? n - 1 - i : i;
      const isRowActive = actualRow === lastRow;

      ctx.fillStyle = isRowActive ? '#d97706' : '#221408';
      ctx.font = isRowActive
        ? `bold ${Math.max(16, Math.round(28 * (19 / n)))}px "Segoe UI", -apple-system, system-ui, sans-serif`
        : `700 ${Math.max(14, Math.round(24 * (19 / n)))}px "Segoe UI", -apple-system, system-ui, sans-serif`;

      ctx.fillText(rowStr, center - gridExtent / 2 - pad, pos);
      ctx.fillText(rowStr, center + gridExtent / 2 + pad, pos);
    }
    texture.update(false);
  }

  private animateLastMoveMarker(): void {
    if (!this.lastMoveRing.isVisible) return;
    const now = performance.now();
    const t = now / 1000;
    const since = (now - this.lastMovePulseAt) / 1000;
    const pop = since >= 0 && since < 0.6 ? 1 + 1.2 * Math.exp(-since * 8) : 1;
    const shimmer = 1 + 0.055 * Math.sin(t * 6);

    this.lastMoveRing.scaling.set(pop * shimmer, 1, pop * shimmer);
    this.lastMoveGlow.scaling.setAll(1 + 0.08 * Math.sin(t * 4));

    const beaconBaseY = 1.48;
    this.lastMoveBeacon.position.y = beaconBaseY + 0.07 * Math.sin(t * 3.8);
    this.lastMoveBeacon.rotation.y = t * 2.2;
    this.lastMoveBeacon.rotation.z = 0.12 * Math.sin(t * 1.6);
    this.lastMoveBeacon.scaling.setAll(pop * (1 + 0.08 * Math.sin(t * 5)));

    this.lastMovePillar.scaling.x = 1 + 0.12 * Math.sin(t * 4);
    this.lastMovePillar.scaling.z = 1 + 0.12 * Math.sin(t * 4);

    this.lastMoveMaterial.alpha = Math.min(
      1,
      0.72 + 0.22 * (0.5 + 0.5 * Math.sin(t * 6)) + (since >= 0 && since < 0.6 ? 0.18 : 0)
    );
  }

  private worldCoordinateX(col: number): number {
    return (col - (this.size - 1) / 2) * SPACING;
  }

  private worldCoordinateZ(row: number): number {
    return ((this.size - 1) / 2 - row) * SPACING;
  }

  private createPieceNode(rank: number, color: number, index: number, dead: boolean): TransformNode {
    const wrapper = new TransformNode(`piece-${index}`, this.scene);
    if (dead) {
      this.buildDeadCube(wrapper, color);
      return wrapper;
    }
    if (this.currentStyle === 'stones') {
      this.buildStone(wrapper, color);
      return wrapper;
    }
    if (this.fallback) {
      this.buildPrimitive(wrapper, rank, color);
      return wrapper;
    }

    const file = PIECE_FILES[Math.max(0, Math.min(PIECE_FILES.length - 1, rank))];
    const containers = this.styleContainers.get(this.currentStyle);
    const container = containers?.get(file);
    if (!container) {
      this.buildStone(wrapper, color);
      return wrapper;
    }

    const entries = container.instantiateModelsToScene(
      (source) => `${source}-${index}`,
      false
    );
    const root = entries.rootNodes[0] as TransformNode;
    root.parent = wrapper;
    root.name = `piece-root-${index}`;

    const meshes = root.getChildMeshes(false);
    if (root instanceof Mesh) meshes.push(root);
    for (const mesh of meshes) {
      mesh.material = color === BLACK ? this.blackMaterial : this.whiteMaterial;
      mesh.isPickable = false;
    }

    const { min, max } = root.getHierarchyBoundingVectors(true);
    const scale = this.styleScales.get(this.currentStyle) ?? 1.05 / (max.y - min.y || 1);
    root.scaling.setAll(scale);
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;
    root.position.set(-centerX * scale, -min.y * scale, -centerZ * scale);

    return wrapper;
  }

  private buildStone(wrapper: TransformNode, color: number): void {
    const material = color === BLACK ? this.blackMaterial : this.whiteMaterial;
    const stone = MeshBuilder.CreateSphere(
      'go-stone',
      { diameterX: 0.94, diameterY: 0.32, diameterZ: 0.94, segments: 24 },
      this.scene
    );
    stone.material = material;
    stone.parent = wrapper;
    stone.position.y = 0.16;
    stone.isPickable = false;
  }

  private buildDeadCube(wrapper: TransformNode, color: number): void {
    const size = 0.44;
    const height = size * 0.55;
    const cube = MeshBuilder.CreateBox(
      'dead-cube',
      { width: size, height, depth: size },
      this.scene
    );
    cube.material = color === BLACK ? this.blackMaterial : this.whiteMaterial;
    cube.parent = wrapper;
    cube.position.y = height / 2;
    cube.isPickable = false;
  }

  private buildPrimitive(wrapper: TransformNode, rank: number, color: number): void {
    const material = color === BLACK ? this.blackMaterial : this.whiteMaterial;

    const base = MeshBuilder.CreateCylinder(
      'primitive-base',
      { height: 0.12, diameterTop: 0.56, diameterBottom: 0.64, tessellation: 24 },
      this.scene
    );
    base.material = material;
    base.parent = wrapper;
    base.position.y = 0.06;
    base.isPickable = false;

    const bodyHeight = 0.3 + rank * 0.11;
    const body = MeshBuilder.CreateCylinder(
      'primitive-body',
      { height: bodyHeight, diameterTop: 0.22, diameterBottom: 0.4, tessellation: 24 },
      this.scene
    );
    body.material = material;
    body.parent = wrapper;
    body.position.y = 0.12 + bodyHeight / 2;
    body.isPickable = false;

    const head = MeshBuilder.CreateSphere(
      'primitive-head',
      { diameter: 0.2 + rank * 0.05, segments: 14 },
      this.scene
    );
    head.material = material;
    head.parent = wrapper;
    head.position.y = 0.12 + bodyHeight + 0.1;
    head.isPickable = false;
  }

  private spawnPlacementTrail(
    root: TransformNode,
    color: number
  ): { stop: () => void; dispose: () => void } {
    const anchor = MeshBuilder.CreateBox(
      `trail-anchor-${this.effectSeed++}`,
      { size: 0.01 },
      this.scene
    );
    anchor.isVisible = false;
    anchor.isPickable = false;
    anchor.parent = root;
    anchor.position.set(0, 0, 0);

    const particles = new ParticleSystem(
      `placement-trail-${this.effectSeed++}`,
      160,
      this.scene
    );
    particles.particleTexture = this.particleTexture;
    particles.emitter = anchor;

    // Golden amber stardust for Black, celestial cyan starlight for White
    const isBlack = color === BLACK;
    if (isBlack) {
      particles.color1 = new Color4(1.0, 0.78, 0.22, 1.0);
      particles.color2 = new Color4(1.0, 0.48, 0.1, 0.85);
      particles.colorDead = new Color4(0.8, 0.25, 0.02, 0);
    } else {
      particles.color1 = new Color4(0.65, 0.9, 1.0, 1.0);
      particles.color2 = new Color4(0.92, 0.96, 1.0, 0.9);
      particles.colorDead = new Color4(0.35, 0.65, 0.95, 0);
    }

    particles.minSize = 0.05;
    particles.maxSize = 0.18;
    particles.minLifeTime = 0.28;
    particles.maxLifeTime = 0.65;
    particles.emitRate = 140; // Continuous stream of sparkling particles while descending
    particles.blendMode = ParticleSystem.BLENDMODE_ADD;

    particles.minEmitBox = new Vector3(-0.09, -0.05, -0.09);
    particles.maxEmitBox = new Vector3(0.09, 0.05, 0.09);

    particles.direction1 = new Vector3(-0.45, 0.2, -0.45);
    particles.direction2 = new Vector3(0.45, 1.0, 0.45);

    particles.minEmitPower = 0.2;
    particles.maxEmitPower = 0.8;
    particles.gravity = new Vector3(0, -0.6, 0);

    particles.minAngularSpeed = -4;
    particles.maxAngularSpeed = 4;
    particles.updateSpeed = 0.014;

    particles.start();

    return {
      stop: () => {
        particles.stop();
      },
      dispose: () => {
        try {
          particles.stop();
          window.setTimeout(() => {
            try {
              particles.dispose();
              anchor.dispose();
            } catch {
              // Ignore if already disposed
            }
          }, 800);
        } catch {
          // Ignore
        }
      }
    };
  }

  private animatePlacement(
    root: TransformNode,
    targetY: number,
    color: number,
    onComplete?: () => void
  ): void {
    let trail: { stop: () => void; dispose: () => void } | null = null;
    try {
      trail = this.spawnPlacementTrail(root, color);
    } catch {
      // Particles are purely cosmetic.
    }

    try {
      const startY = targetY + 3.4;
      root.position.y = startY;

      // Position animation: smoothly descends from above (0.55s) with a gentle settle
      const animY = new Animation(
        'piecePlacementY',
        'position.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // 34 frames at 60fps = 0.567 seconds
      animY.setKeys([
        { frame: 0, value: startY },
        { frame: 28, value: targetY },
        { frame: 31, value: targetY + 0.04 },
        { frame: 34, value: targetY }
      ]);

      const ease = new CubicEase();
      ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
      animY.setEasingFunction(ease);

      // Scaling animation: starts slightly compact and blooms into full size
      const origScaleX = root.scaling.x;
      const origScaleY = root.scaling.y;
      const origScaleZ = root.scaling.z;

      root.scaling.set(origScaleX * 0.82, origScaleY * 0.82, origScaleZ * 0.82);

      const animScaleX = new Animation(
        'piecePlacementScaleX',
        'scaling.x',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      animScaleX.setKeys([
        { frame: 0, value: origScaleX * 0.82 },
        { frame: 28, value: origScaleX }
      ]);
      animScaleX.setEasingFunction(ease);

      const animScaleY = new Animation(
        'piecePlacementScaleY',
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      animScaleY.setKeys([
        { frame: 0, value: origScaleY * 0.82 },
        { frame: 28, value: origScaleY }
      ]);
      animScaleY.setEasingFunction(ease);

      const animScaleZ = new Animation(
        'piecePlacementScaleZ',
        'scaling.z',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      animScaleZ.setKeys([
        { frame: 0, value: origScaleZ * 0.82 },
        { frame: 28, value: origScaleZ }
      ]);
      animScaleZ.setEasingFunction(ease);

      root.animations = [animY, animScaleX, animScaleY, animScaleZ];
      this.scene.beginAnimation(root, 0, 34, false, 1.0, () => {
        root.position.y = targetY;
        root.scaling.set(origScaleX, origScaleY, origScaleZ);
        trail?.stop();
        trail?.dispose();
        onComplete?.();
      });
    } catch {
      root.position.y = targetY;
      trail?.dispose();
      onComplete?.();
    }
  }

  private explodePiece(piece: PieceHandle): void {
    const position = piece.root.position.clone();
    const color =
      piece.color === BLACK ? new Color3(1.0, 0.36, 0.08) : new Color3(0.5, 0.86, 1.0);
    this.spawnBurst(position.add(new Vector3(0, 0.24, 0)), color, 95, 4.6);
    this.spawnShards(position, piece.color);
    this.spawnShockwave(position, color);
    piece.root.dispose();
  }

  private spawnBurst(position: Vector3, color: Color3, count: number, power: number): void {
    const particles = new ParticleSystem(`burst-${this.effectSeed++}`, count * 2, this.scene);
    particles.particleTexture = this.particleTexture;
    particles.emitter = position.clone();
    particles.minEmitBox = new Vector3(-0.12, -0.02, -0.12);
    particles.maxEmitBox = new Vector3(0.12, 0.1, 0.12);
    particles.color1 = new Color4(color.r, color.g, color.b, 1);
    particles.color2 = new Color4(
      Math.min(1, color.r + 0.45),
      Math.min(1, color.g + 0.45),
      Math.min(1, color.b + 0.45),
      0.9
    );
    particles.colorDead = new Color4(color.r, color.g, color.b, 0);
    particles.minSize = 0.05;
    particles.maxSize = 0.16;
    particles.minLifeTime = 0.35;
    particles.maxLifeTime = 0.8;
    particles.emitRate = 0;
    particles.manualEmitCount = count;
    particles.blendMode = ParticleSystem.BLENDMODE_ADD;
    particles.direction1 = new Vector3(-power, 1.2, -power);
    particles.direction2 = new Vector3(power, power + 2.2, power);
    particles.minEmitPower = 0.6;
    particles.maxEmitPower = power;
    particles.gravity = new Vector3(0, -7, 0);
    particles.minAngularSpeed = -5;
    particles.maxAngularSpeed = 5;
    particles.updateSpeed = 0.012;
    particles.start();
    window.setTimeout(() => {
      try {
        particles.dispose();
      } catch {
        // The scene may already be disposed.
      }
    }, 1500);
  }

  private spawnShards(position: Vector3, color: number): void {
    const material = color === BLACK ? this.blackMaterial : this.whiteMaterial;
    for (let i = 0; i < 8; i++) {
      const size = 0.07 + Math.random() * 0.09;
      const shard = MeshBuilder.CreateBox(
        `capture-shard-${this.effectSeed++}`,
        { size },
        this.scene
      );
      shard.material = material;
      shard.position.copyFrom(position);
      shard.position.y += 0.18 + Math.random() * 0.2;
      shard.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      shard.isPickable = false;

      const velocity = new Vector3(
        (Math.random() - 0.5) * 4.5,
        1.4 + Math.random() * 3,
        (Math.random() - 0.5) * 4.5
      );
      const start = performance.now();
      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
        const t = (performance.now() - start) / 1000;
        if (t > 0.9) {
          if (observer) this.scene.onBeforeRenderObservable.remove(observer);
          shard.dispose();
          return;
        }
        velocity.y -= 9.8 * dt;
        shard.position.addInPlace(velocity.scale(dt));
        shard.rotation.x += dt * 7;
        shard.rotation.z += dt * 5;
        shard.scaling.setAll(Math.max(0.01, 1 - t / 0.9));
      });
    }
  }

  private spawnShockwave(position: Vector3, color: Color3): void {
    const material = new StandardMaterial(`shock-material-${this.effectSeed++}`, this.scene);
    material.diffuseColor = Color3.Black();
    material.emissiveColor = color.clone();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.alpha = 0.75;
    material.backFaceCulling = false;

    const ring = MeshBuilder.CreateTorus(
      `shock-ring-${this.effectSeed++}`,
      { diameter: 0.7, thickness: 0.05, tessellation: 32 },
      this.scene
    );
    ring.material = material;
    ring.position.copyFrom(position);
    ring.position.y += 0.06;
    ring.isPickable = false;

    const start = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = (performance.now() - start) / 500;
      if (t >= 1) {
        if (observer) this.scene.onBeforeRenderObservable.remove(observer);
        ring.dispose();
        material.dispose();
        return;
      }
      ring.scaling.setAll(0.4 + t * 2.4);
      material.alpha = 0.75 * (1 - t);
    });
  }

  private attachPointer(): void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let lastHoverIndex: number | null = null;

    this.canvas.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
      startY = event.clientY;
      startTime = performance.now();
    });

    this.canvas.addEventListener('pointerup', (event) => {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) > 10) return;
      if (performance.now() - startTime > 800) return;
      this.pickIntersection(event);
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.boardMesh) return;
      const pick = this.scene.pick(event.offsetX, event.offsetY, (mesh) => mesh === this.boardMesh);
      const point = pick?.pickedPoint;
      if (!pick?.hit || !point) {
        if (lastHoverIndex !== null) {
          lastHoverIndex = null;
          this.setHoverMarker(null);
          this.hoverHandler?.(null);
        }
        return;
      }

      const n = this.size;
      const half = (n - 1) / 2;
      const col = Math.round(point.x / SPACING + half);
      const row = Math.round(half - point.z / SPACING);
      if (col < 0 || col >= n || row < 0 || row >= n) {
        if (lastHoverIndex !== null) {
          lastHoverIndex = null;
          this.setHoverMarker(null);
          this.hoverHandler?.(null);
        }
        return;
      }

      const index = row * n + col;
      if (index !== lastHoverIndex) {
        lastHoverIndex = index;
        this.setHoverMarker(index);
        this.hoverHandler?.(index);
      }
    });

    this.canvas.addEventListener('pointerleave', () => {
      if (lastHoverIndex !== null) {
        lastHoverIndex = null;
        this.setHoverMarker(null);
        this.hoverHandler?.(null);
      }
    });
  }

  private setHoverMarker(index: number | null): void {
    if (index === null) {
      this.hoverMarker.isVisible = false;
      return;
    }
    const n = this.size;
    const row = Math.floor(index / n);
    const col = index % n;
    this.hoverMarker.position.set(this.worldCoordinateX(col), 0.028, this.worldCoordinateZ(row));
    this.hoverMarker.isVisible = true;
  }

  private pickIntersection(event: PointerEvent): void {
    if (!this.boardMesh || !this.clickHandler) return;
    const pick = this.scene.pick(event.offsetX, event.offsetY, (mesh) => mesh === this.boardMesh);
    const point = pick?.pickedPoint;
    if (!pick?.hit || !point) return;

    const n = this.size;
    const half = (n - 1) / 2;
    const col = Math.round(point.x / SPACING + half);
    const row = Math.round(half - point.z / SPACING);
    if (col < 0 || col >= n || row < 0 || row >= n) return;

    this.clickHandler(row * n + col);
  }

  resize = (): void => {
    this.engine.resize();
  };

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.scene.dispose();
    this.engine.dispose();
  }
}
