import {
  Animation,
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
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
import { starPoints, type BoardSize } from '../game/BoardSize';
import type { Evaluation } from '../ai/KataGoEngine';
import { heatColor } from './heatmap';
import { pieceRank } from './pieceRank';

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

const PIECE_FILES = ['pawn', 'knight', 'bishop', 'rook', 'queen'] as const;
type PieceFile = (typeof PIECE_FILES)[number];

const SPACING = 1;
const TEXTURE_SIZE = 1024;

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

  private containers = new Map<PieceFile, AssetContainer>();
  private pieces = new Map<number, PieceHandle>();
  private fallback = false;

  private size: BoardSize = 19;
  private clickHandler: ((index: number) => void) | null = null;

  ready = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.055, 0.045, 0.035, 1);

    this.camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,
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

    const directional = new DirectionalLight('directional', new Vector3(-0.5, -1, -0.4), this.scene);
    directional.intensity = 0.75;
    directional.position = new Vector3(12, 24, 12);

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

    this.attachPointer();
    window.addEventListener('resize', this.resize);
    this.engine.runRenderLoop(() => this.scene.render());

    void this.loadPieces();
  }

  private async loadPieces(): Promise<void> {
    const base = import.meta.env.BASE_URL || './';
    const root = `${base.endsWith('/') ? base : `${base}/`}assets/chess/`;
    try {
      for (const file of PIECE_FILES) {
        const container = await SceneLoader.LoadAssetContainerAsync(
          root,
          `${file}.glb`,
          this.scene
        );
        this.containers.set(file, container);
      }
    } catch (error) {
      console.warn('Chess GLB assets unavailable, using primitive stones.', error);
      this.fallback = true;
      this.containers.clear();
    }
    this.ready = true;
  }

  setOnIntersectionClick(handler: (index: number) => void): void {
    this.clickHandler = handler;
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
      star.position.set(col * SPACING - half, 0.02, row * SPACING - half);
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
    plane.position.y = 0.024;
    plane.material = heatMaterial;
    plane.isPickable = false;
    plane.alphaIndex = 1;
    this.boardNodes.push(plane);
    this.heatPlane = plane;

    this.camera.radius = Math.max(13, n * 1.65);
    this.camera.lowerRadiusLimit = Math.max(8, n * 0.75);
    this.camera.upperRadiusLimit = Math.max(24, n * 4);
    this.camera.setTarget(Vector3.Zero());
  }

  update(state: RenderState): void {
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
    if (ownership && ownership.length >= n * n) {
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const value = ownership[row * n + col];
          const [r, g, b, a] = heatColor(value);
          const x = (col + 0.5) * cell;
          const y = (row + 0.5) * cell;
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
          existing?.root.dispose();
          const root = this.createPieceNode(rank, color, index, dead);
          const row = Math.floor(index / n);
          const col = index % n;
          root.position.set(this.worldCoordinate(col), 0.03, this.worldCoordinate(row));
          this.animateDrop(root);
          this.pieces.set(index, { root, rank, color, dead });
        }
      } else if (existing) {
        existing.root.dispose();
        this.pieces.delete(index);
      }
    }
  }

  private rankFor(index: number, color: number, state: RenderState): { rank: number; dead: boolean } {
    const ownership = state.evaluation?.ownership[index] ?? 0;
    return pieceRank(ownership, color, index === state.goban.lastMove);
  }

  private worldCoordinate(position: number): number {
    return (position - (this.size - 1) / 2) * SPACING;
  }

  private createPieceNode(rank: number, color: number, index: number, dead: boolean): TransformNode {
    const wrapper = new TransformNode(`piece-${index}`, this.scene);
    if (dead) {
      this.buildDeadCube(wrapper, color);
      return wrapper;
    }
    if (this.fallback) {
      this.buildPrimitive(wrapper, rank, color);
      return wrapper;
    }

    const file = PIECE_FILES[Math.max(0, Math.min(PIECE_FILES.length - 1, rank))];
    const container = this.containers.get(file);
    if (!container) {
      this.buildPrimitive(wrapper, rank, color);
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
    const dimensions = max.subtract(min);
    const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;
    const scale = 0.72 / maxDimension;
    root.scaling.setAll(scale);
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;
    root.position.set(-centerX * scale, -min.y * scale, -centerZ * scale);

    return wrapper;
  }

  private buildDeadCube(wrapper: TransformNode, color: number): void {
    const size = 0.34;
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
      { height: 0.1, diameterTop: 0.44, diameterBottom: 0.5, tessellation: 24 },
      this.scene
    );
    base.material = material;
    base.parent = wrapper;
    base.position.y = 0.05;
    base.isPickable = false;

    const bodyHeight = 0.2 + rank * 0.07;
    const body = MeshBuilder.CreateCylinder(
      'primitive-body',
      { height: bodyHeight, diameterTop: 0.16, diameterBottom: 0.3, tessellation: 24 },
      this.scene
    );
    body.material = material;
    body.parent = wrapper;
    body.position.y = 0.1 + bodyHeight / 2;
    body.isPickable = false;

    const head = MeshBuilder.CreateSphere(
      'primitive-head',
      { diameter: 0.14 + rank * 0.035, segments: 14 },
      this.scene
    );
    head.material = material;
    head.parent = wrapper;
    head.position.y = 0.1 + bodyHeight + 0.07;
    head.isPickable = false;
  }

  private animateDrop(root: TransformNode): void {
    try {
      const targetY = root.position.y;
      root.position.y = targetY + 2.2;
      const animation = new Animation(
        'drop',
        'position.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      animation.setKeys([
        { frame: 0, value: targetY + 2.2 },
        { frame: 10, value: targetY }
      ]);
      root.animations.push(animation);
      this.scene.beginAnimation(root, 0, 10, false);
    } catch {
      // Animation is purely cosmetic.
    }
  }

  private attachPointer(): void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

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
  }

  private pickIntersection(event: PointerEvent): void {
    if (!this.boardMesh || !this.clickHandler) return;
    const pick = this.scene.pick(event.offsetX, event.offsetY, (mesh) => mesh === this.boardMesh);
    const point = pick?.pickedPoint;
    if (!pick?.hit || !point) return;

    const n = this.size;
    const half = (n - 1) / 2;
    const col = Math.round(point.x / SPACING + half);
    const row = Math.round(point.z / SPACING + half);
    if (col < 0 || col >= n || row < 0 || row >= n) return;

    const x = (col - half) * SPACING;
    const z = (row - half) * SPACING;
    if (Math.hypot(point.x - x, point.z - z) > SPACING * 0.5) return;

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
