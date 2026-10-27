import {
  ArcRotateCamera,
  Camera,
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  Engine,
  GlowLayer,
  HemisphericLight,
  MaterialPluginBase,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PBRMaterial,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
  type AnimationGroup,
  type AssetContainer,
  type LinesMesh,
  type Material,
  type Node,
  type UniformBuffer
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { BLACK, WHITE, type Goban } from '../game/Goban';
import { starPoints, COORD_LETTERS, type BoardSize } from '../game/BoardSize';
import type { Evaluation } from '../ai/KataGoEngine';
import { detectTwoEyes, type EyeAnalysis } from '../game/eyes';
import { heatColor, type HeatmapTheme } from './heatmap';
import { boardPalette, type BoardColor } from './boardTheme';
import type { FenceModel } from './fenceModels';
import { pieceRank } from './pieceRank';

export type PieceStyle =
  | 'clayfoot'
  | 'dark-yagami'
  | 'animal-bag'
  | 'kenney-pets'
  | 'quirky-animals'
  | 'stones';
export type DeadStoneStyle = 'cube' | 'stone';
export type CameraProjection = 'perspective' | 'orthographic';
export type CaptureEffect = 'shatter' | 'dissolve' | 'height';

export interface RenderState {
  goban: Goban;
  evaluation: Evaluation | null;
  moveWeights: Map<number, number>;
  opponentColor: number | null;
  showHeatmap: boolean;
  heatmapTheme: HeatmapTheme;
  boardColor: BoardColor;
  animations: boolean;
  showTwoEyeHighlight: boolean;
  wallModel: WallModel;
  fenceModel: FenceModel;
  trueEyeModel: TrueEyeModel;
  showFalseEyeModels: boolean;
  captureEffect: CaptureEffect;
}

export type WallModel = 'off' | 'seaweed' | 'fence';
export type TrueEyeModel = 'off' | 'cute' | 'trueeye';
type EyeModelKind = 'seaweed' | 'fence' | 'cute' | 'trueeye' | 'falseeye';

type AlertAnimation = 'walk' | 'run';

interface PieceHandle {
  root: TransformNode;
  rank: number;
  color: number;
  dead: boolean;
  alert: AlertAnimation | null;
}

interface PieceMetrics {
  scale: number;
  centerX: number;
  centerZ: number;
  baseY: number;
}

interface PendingPlacement {
  root: TransformNode;
  color: number;
  cancel: () => void;
}

class DissolveMaterialPlugin extends MaterialPluginBase {
  progress = 0;

  constructor(material: Material) {
    super(material, 'Dissolve', 200, {}, true);
  }

  getClassName(): string {
    return 'DissolveMaterialPlugin';
  }

  getUniforms(): {
    ubo: Array<{ name: string; size: number; type: string }>;
  } {
    return {
      ubo: [{ name: 'dissolveProgress', size: 1, type: 'float' }]
    };
  }

  bindForSubMesh(uniformBuffer: UniformBuffer): void {
    uniformBuffer.updateFloat('dissolveProgress', this.progress);
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
float dissolveNoise(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}`,
      CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
if (dissolveNoise(floor(vPositionW * 24.0)) < dissolveProgress) discard;`
    };
  }
}

const PIECE_FILES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const;
type PieceFile = (typeof PIECE_FILES)[number];

const STYLE_FOLDERS: Record<Exclude<PieceStyle, 'stones'>, string> = {
  clayfoot: 'assets/chess/clayfoot/',
  'dark-yagami': 'assets/chess/dark-yagami/',
  'animal-bag': 'assets/chess/animal-bag/',
  'kenney-pets': 'assets/chess/kenney-pets/',
  'quirky-animals': 'assets/chess/quirky-animals/'
};

const ORIGINAL_COLOR_STYLES = new Set<PieceStyle>([
  'animal-bag',
  'kenney-pets',
  'quirky-animals'
]);

const PIECE_TARGET_HEIGHTS: Record<PieceFile, number> = {
  pawn: 0.56,
  knight: 0.76,
  bishop: 0.86,
  rook: 0.94,
  queen: 1.04,
  king: 1.12
};

const PIECE_SCALE_MULTIPLIERS: Partial<
  Record<PieceStyle, Partial<Record<PieceFile, number>>>
> = {};

const ANIMAL_SCALE_MULTIPLIERS: Record<string, number> = {
  Muskrat: 0.7,
  Taipan: 0.5
};

const PIECE_CENTER_OFFSETS: Partial<
  Record<PieceStyle, Partial<Record<PieceFile, { x?: number; z?: number }>>>
> = {
  'animal-bag': { rook: { x: 0.3 } }
};

const IDLE_ANIMATION_SPEED = 0.5;
const WALK_ANIMATION_SPEED = 0.75;
const RUN_ANIMATION_SPEED = 1.15;

const SPACING = 1;
const TEXTURE_SIZE = 1024;
const BLACK_MOVE_COLOR = new Color3(1.0, 0.58, 0.12);
const WHITE_MOVE_COLOR = new Color3(0.12, 0.78, 1.0);
const EYE_MODEL_FILES: Record<EyeModelKind, string> = {
  seaweed: 'sea_weed.glb',
  fence: 'fense-ver2-dark.glb',
  cute: 'cute_cartoon_flower.glb',
  trueeye: 'trueeye_flower.glb',
  falseeye: 'falseeye_weed.glb'
};
const EYE_MODEL_FOLDERS: Record<EyeModelKind, string> = {
  seaweed: 'assets/wall/',
  fence: 'assets/wall/',
  cute: 'assets/eye/',
  trueeye: 'assets/eye/',
  falseeye: 'assets/eye/'
};
const EYE_MODEL_HEIGHTS: Record<EyeModelKind, number> = {
  seaweed: 1.2,
  fence: 1.1,
  cute: 0.5,
  trueeye: 0.55,
  falseeye: 1.2
};
const FENCE_MODEL_SCALE = 0.6;

export class Board3D {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private cameraProjection: CameraProjection = 'orthographic';

  private woodMaterial: StandardMaterial;
  private starMaterial: StandardMaterial;
  private blackMaterial: StandardMaterial;
  private whiteMaterial: StandardMaterial;
  private animalWhiteMaterial: StandardMaterial;
  private animalBlackMaterial: StandardMaterial;
  private quirkyWhiteMaterial: StandardMaterial;
  private quirkyBlackMaterial: StandardMaterial;

  private boardNodes: Node[] = [];
  private boardMesh: Mesh | null = null;
  private gridMesh: LinesMesh | null = null;
  private heatPlane: Mesh | null = null;
  private heatTexture: DynamicTexture | null = null;
  private coordPlane: Mesh | null = null;
  private coordTexture: DynamicTexture | null = null;

  private boardColor: BoardColor = 'wood';
  private fenceModel: FenceModel = 'dark';
  private currentStyle: PieceStyle = 'quirky-animals';
  private deadStoneStyle: DeadStoneStyle = 'cube';
  private perspective: 'black' | 'white' = 'black';
  private directional: DirectionalLight;
  private styleContainers = new Map<PieceStyle, Map<PieceFile, AssetContainer>>();
  private styleMetrics = new Map<PieceStyle, Map<PieceFile, PieceMetrics>>();
  private styleAnimals = new Map<PieceStyle, Map<PieceFile, string>>();
  private styleLoading = new Map<PieceStyle, Promise<void>>();
  private pieces = new Map<number, PieceHandle>();
  private pieceAnimations = new Map<number, AnimationGroup[]>();
  private animationsEnabled = true;
  private fallback = false;
  private lastState: RenderState | null = null;

  private eyeContainers = new Map<EyeModelKind, AssetContainer>();
  private eyeScales = new Map<EyeModelKind, number>();
  private eyeLoading: Promise<void> | null = null;
  private eyeLoadFailed = false;
  private eyeDecorations: TransformNode[] = [];
  private eyeDecorKey = '';
  private eyeAnalysis: EyeAnalysis | null = null;
  private eyeModelSeed = 0;

  private particleTexture: DynamicTexture;
  private lastMoveMaterial: StandardMaterial;
  private lastMoveGlowMaterial: StandardMaterial;
  private lastMoveRing: Mesh;
  private lastMoveGlow: Mesh;
  private lastMoveBeacon: Mesh;
  private lastMovePillar: Mesh;
  private lastMoveNumber = -1;
  private lastMovePulseAt = 0;
  private lastMoveEmphasis = 1;
  private glowLayer: GlowLayer;
  private captureCleanups = new Set<() => void>();
  private pendingPlacements = new Map<number, PendingPlacement>();
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
      -Math.PI / 4,
      0.82,
      26,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.panningSensibility = 250;
    (this.camera as unknown as { _panningMouseButton: number })._panningMouseButton = 1;
    this.camera.lowerRadiusLimit = 9;
    this.camera.upperRadiusLimit = 90;
    this.camera.lowerBetaLimit = 0.18;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.04;
    this.camera.wheelDeltaPercentage = 0.02;
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

    this.setBoardColor('wood');

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

    this.animalWhiteMaterial = new StandardMaterial('animal-white', this.scene);
    this.animalWhiteMaterial.diffuseColor = new Color3(0.95, 0.94, 0.9);
    this.animalWhiteMaterial.specularColor = new Color3(0.35, 0.35, 0.35);
    this.animalWhiteMaterial.specularPower = 32;
    this.animalWhiteMaterial.emissiveColor = new Color3(0.045, 0.044, 0.04);

    this.animalBlackMaterial = new StandardMaterial('animal-black', this.scene);
    this.animalBlackMaterial.diffuseColor = new Color3(0.075, 0.075, 0.085);
    this.animalBlackMaterial.specularColor = new Color3(0.45, 0.45, 0.5);
    this.animalBlackMaterial.specularPower = 48;
    this.animalBlackMaterial.emissiveColor = new Color3(0.012, 0.012, 0.02);

    this.quirkyWhiteMaterial = new StandardMaterial('quirky-white', this.scene);
    this.quirkyWhiteMaterial.diffuseColor = new Color3(0.95, 0.94, 0.9);
    this.quirkyWhiteMaterial.specularColor = Color3.Black();
    this.quirkyWhiteMaterial.emissiveColor = new Color3(0.045, 0.044, 0.04);

    this.quirkyBlackMaterial = new StandardMaterial('quirky-black', this.scene);
    this.quirkyBlackMaterial.diffuseColor = new Color3(0.075, 0.075, 0.085);
    this.quirkyBlackMaterial.specularColor = Color3.Black();
    this.quirkyBlackMaterial.emissiveColor = new Color3(0.012, 0.012, 0.02);

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
      { radius: 0.62, tessellation: 48 },
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

    this.glowLayer = new GlowLayer('last-move-glow-layer', this.scene, {
      mainTextureFixedSize: 512,
      blurKernelSize: 48
    });
    this.glowLayer.intensity = 0.75;
    this.glowLayer.addIncludedOnlyMesh(this.lastMoveRing);
    this.glowLayer.addIncludedOnlyMesh(this.lastMoveGlow);
    this.glowLayer.addIncludedOnlyMesh(this.lastMoveBeacon);
    this.glowLayer.addIncludedOnlyMesh(this.lastMovePillar);

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

    this.updateOrthoBounds();
    this.scene.onBeforeRenderObservable.add(() => this.updateOrthoBounds());
    this.scene.onBeforeRenderObservable.add(() => this.animateLastMoveMarker());
    this.scene.onBeforeRenderObservable.add(() => this.animateAlertPieces());

    this.attachPointer();
    window.addEventListener('resize', this.resize);
    this.engine.runRenderLoop(() => this.scene.render());

    void this.setPieceStyle('quirky-animals');
  }

  setCameraProjection(projection: CameraProjection): void {
    this.cameraProjection = projection;
    if (projection === 'orthographic') {
      this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      this.updateOrthoBounds();
    } else {
      this.camera.mode = Camera.PERSPECTIVE_CAMERA;
    }
  }

  private updateOrthoBounds(): void {
    if (this.cameraProjection !== 'orthographic') return;
    const aspect =
      this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    const halfHeight = this.camera.radius * Math.tan(this.camera.fov / 2);
    this.camera.orthoTop = halfHeight;
    this.camera.orthoBottom = -halfHeight;
    this.camera.orthoRight = halfHeight * aspect;
    this.camera.orthoLeft = -halfHeight * aspect;
  }

  setPerspective(side: 'black' | 'white'): void {
    if (this.perspective === side) return;
    this.perspective = side;
    const targetAlpha = side === 'white' ? (Math.PI * 3) / 4 : -Math.PI / 4;
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
      if (ORIGINAL_COLOR_STYLES.has(this.currentStyle)) {
        this.pieces.forEach((piece) => this.disposePiece(piece.root));
        this.pieces.clear();
      }
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
    this.cancelCaptureEffects();
    if (style !== 'stones') {
      await this.ensureStyleLoaded(style);
    }
    this.ready = true;
    this.pieces.forEach((piece) => this.disposePiece(piece.root));
    this.pieces.clear();
    if (this.lastState) {
      this.update(this.lastState);
    }
  }

  private ensureStyleLoaded(style: PieceStyle): Promise<void> {
    if (this.styleContainers.has(style) || style === 'stones') {
      return Promise.resolve();
    }
    const existing = this.styleLoading.get(style);
    if (existing) return existing;

    const promise = this.loadStyle(style).finally(() => {
      this.styleLoading.delete(style);
    });
    this.styleLoading.set(style, promise);
    return promise;
  }

  private async loadStyle(style: PieceStyle): Promise<void> {
    const base = import.meta.env.BASE_URL || './';
    const baseUrl = base.endsWith('/') ? base : `${base}/`;
    const folder = STYLE_FOLDERS[style as Exclude<PieceStyle, 'stones'>];
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

      const metrics = new Map<PieceFile, PieceMetrics>();
      if (ORIGINAL_COLOR_STYLES.has(style)) {
        for (const file of PIECE_FILES) {
          const container = containers.get(file);
          if (!container) continue;
          const height = this.measureHeight(container);
          const scale = height > 0 ? PIECE_TARGET_HEIGHTS[file] / height : 1;
          metrics.set(file, this.computeMetrics(container, scale));
        }
      } else {
        // Compute uniform scale so Queen is ~1.05 high
        const queenContainer = containers.get('queen');
        let setScale = 1.0;
        if (queenContainer) {
          const qHeight = this.measureHeight(queenContainer);
          if (qHeight > 0) setScale = 1.05 / qHeight;
        }
        for (const file of PIECE_FILES) {
          const container = containers.get(file);
          if (!container) continue;
          metrics.set(file, this.computeMetrics(container, setScale));
        }
      }

      if (style === 'quirky-animals') {
        for (const container of containers.values()) {
          for (const mesh of container.meshes) {
            if (mesh.material instanceof PBRMaterial) {
              mesh.material.metallic = 0;
              mesh.material.roughness = 1;
              mesh.material.environmentIntensity = 0;
            }
          }
        }
      }

      const animalNames = new Map<PieceFile, string>();
      for (const file of PIECE_FILES) {
        const container = containers.get(file);
        const meshName = container?.meshes.find((mesh) => mesh.name)?.name;
        if (meshName) animalNames.set(file, meshName.split('_LOD')[0]);
      }
      this.styleAnimals.set(style, animalNames);

      this.styleMetrics.set(style, metrics);
      this.styleContainers.set(style, containers);
    } catch (error) {
      console.warn(`Failed loading piece style [${style}], using fallback.`, error);
      this.fallback = true;
    }
  }

  private measureHeight(container: AssetContainer): number {
    const entries = container.instantiateModelsToScene(undefined, false);
    const rootNode = entries.rootNodes[0] as TransformNode | undefined;
    let height = 1;
    if (rootNode) {
      const { min, max } = rootNode.getHierarchyBoundingVectors(true);
      height = max.y - min.y;
    }
    entries.animationGroups.forEach((group) => group.dispose());
    entries.rootNodes.forEach((node) => node.dispose());
    return height;
  }

  private computeMetrics(container: AssetContainer, scale: number): PieceMetrics {
    const entries = container.instantiateModelsToScene(undefined, false);
    const root = entries.rootNodes[0] as TransformNode | undefined;
    const metrics: PieceMetrics = { scale, centerX: 0, centerZ: 0, baseY: 0 };
    if (!root) {
      entries.animationGroups.forEach((group) => group.dispose());
      entries.rootNodes.forEach((node) => node.dispose());
      return metrics;
    }

    root.scaling.setAll(scale);
    root.computeWorldMatrix(true);
    const meshes: Mesh[] = [];
    for (const child of root.getChildMeshes(false)) {
      if (child instanceof Mesh && child.getTotalVertices() > 0) meshes.push(child);
    }
    if (root instanceof Mesh && root.getTotalVertices() > 0) meshes.push(root);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    const point = Vector3.Zero();

    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
      if (!positions) continue;
      const matrix = mesh.getWorldMatrix();
      for (let i = 0; i < positions.length; i += 3) {
        Vector3.TransformCoordinatesFromFloatsToRef(
          positions[i],
          positions[i + 1],
          positions[i + 2],
          matrix,
          point
        );
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
        if (point.z < minZ) minZ = point.z;
        if (point.z > maxZ) maxZ = point.z;
      }
    }

    if (Number.isFinite(minY) && Number.isFinite(maxY)) {
      const threshold = minY + Math.max(0.02, (maxY - minY) * 0.12);
      let baseMinX = Infinity;
      let baseMaxX = -Infinity;
      let baseMinZ = Infinity;
      let baseMaxZ = -Infinity;

      for (const mesh of meshes) {
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (!positions) continue;
        const matrix = mesh.getWorldMatrix();
        for (let i = 0; i < positions.length; i += 3) {
          Vector3.TransformCoordinatesFromFloatsToRef(
            positions[i],
            positions[i + 1],
            positions[i + 2],
            matrix,
            point
          );
          if (point.y > threshold) continue;
          if (point.x < baseMinX) baseMinX = point.x;
          if (point.x > baseMaxX) baseMaxX = point.x;
          if (point.z < baseMinZ) baseMinZ = point.z;
          if (point.z > baseMaxZ) baseMaxZ = point.z;
        }
      }

      if (Number.isFinite(baseMinX) && Number.isFinite(baseMaxX)) {
        metrics.centerX = (baseMinX + baseMaxX) / 2;
        metrics.centerZ = (baseMinZ + baseMaxZ) / 2;
      } else {
        metrics.centerX = (minX + maxX) / 2;
        metrics.centerZ = (minZ + maxZ) / 2;
      }
      metrics.baseY = minY;
    }

    entries.animationGroups.forEach((group) => group.dispose());
    entries.rootNodes.forEach((node) => node.dispose());
    return metrics;
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
    this.cancelCaptureEffects();
    this.size = size;
    this.pendingPlacements.forEach((pending) => pending.cancel());
    this.pendingPlacements.clear();
    for (const node of this.boardNodes) node.dispose();
    this.boardNodes = [];
    this.boardMesh = null;
    this.gridMesh = null;
    this.heatPlane = null;
    this.heatTexture = null;
    this.coordPlane = null;
    this.coordTexture = null;
    this.pieces.forEach((piece) => this.disposePiece(piece.root));
    this.pieces.clear();
    this.clearEyeDecorations();
    this.eyeDecorKey = '';
    this.eyeAnalysis = null;
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
    grid.color = Color3.FromHexString(boardPalette(this.boardColor).grid);
    grid.isPickable = false;
    this.boardNodes.push(grid);
    this.gridMesh = grid;

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
    if (state.boardColor !== this.boardColor) this.setBoardColor(state.boardColor);
    if (state.fenceModel !== this.fenceModel) {
      this.fenceModel = state.fenceModel;
      this.applyFenceModel();
      this.eyeDecorKey = '';
    }
    if (state.goban.size !== this.size) this.setBoardSize(state.goban.size);
    if (state.animations !== this.animationsEnabled) {
      this.animationsEnabled = state.animations;
      this.pieces.forEach((piece) => this.disposePiece(piece.root));
      this.pieces.clear();
    }
    const wantsEyes =
      state.showTwoEyeHighlight ||
      state.wallModel !== 'off' ||
      state.trueEyeModel !== 'off' ||
      state.showFalseEyeModels;
    this.eyeAnalysis = wantsEyes ? detectTwoEyes(state.goban) : null;
    this.updateHeat(state);
    this.syncPieces(state);
    this.updateEyeDecorations(state);
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
    if (state.showHeatmap && ownership && ownership.length >= n * n) {
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const value = ownership[row * n + col];
          const [r, g, b, a] = heatColor(value, state.heatmapTheme);
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

    if (state.showTwoEyeHighlight && this.eyeAnalysis) {
      this.drawTwoEyeHighlights(
        context as unknown as CanvasRenderingContext2D,
        n,
        cell,
        isWhite,
        this.eyeAnalysis
      );
    }

    texture.update(false);
  }

  private drawTwoEyeHighlights(
    context: CanvasRenderingContext2D,
    n: number,
    cell: number,
    isWhite: boolean,
    analysis: EyeAnalysis
  ): void {
    const point = (index: number) => {
      const row = Math.floor(index / n);
      const col = index % n;
      const drawCol = isWhite ? n - 1 - col : col;
      const drawRow = isWhite ? n - 1 - row : row;
      return {
        x: (drawCol + 0.5) * cell,
        y: (drawRow + 0.5) * cell
      };
    };

    context.lineCap = 'round';
    for (const group of analysis.groups) {
      const strong =
        group.color === WHITE ? 'rgba(44, 214, 255, 0.96)' : 'rgba(255, 174, 38, 0.96)';
      const glow =
        group.color === WHITE ? 'rgba(190, 246, 255, 0.72)' : 'rgba(255, 225, 150, 0.72)';
      const pairStart = point(group.pair[0]);
      const pairEnd = point(group.pair[1]);

      context.beginPath();
      context.moveTo(pairStart.x, pairStart.y);
      context.lineTo(pairEnd.x, pairEnd.y);
      context.strokeStyle = glow;
      context.lineWidth = cell * 0.15;
      context.stroke();

      for (const eye of group.eyes) {
        const { x, y } = point(eye);
        context.beginPath();
        context.arc(x, y, cell * 0.38, 0, Math.PI * 2);
        context.strokeStyle = glow;
        context.lineWidth = cell * 0.11;
        context.stroke();
        context.beginPath();
        context.arc(x, y, cell * 0.27, 0, Math.PI * 2);
        context.fillStyle = strong;
        context.fill();
      }
    }

    for (const [eye, color] of analysis.falseEyeOwner) {
      const strong = color === WHITE ? 'rgba(44, 214, 255, 0.98)' : 'rgba(255, 154, 20, 0.98)';
      const glow = color === WHITE ? 'rgba(190, 246, 255, 0.8)' : 'rgba(255, 215, 120, 0.8)';
      const { x, y } = point(eye);
      const radius = cell * 0.34;

      context.beginPath();
      context.moveTo(x, y - radius);
      context.lineTo(x + radius, y);
      context.lineTo(x, y + radius);
      context.lineTo(x - radius, y);
      context.closePath();
      context.strokeStyle = glow;
      context.lineWidth = cell * 0.11;
      context.stroke();
      context.fillStyle = strong;
      context.fill();
    }
  }

  private async ensureEyeModels(): Promise<void> {
    if (this.eyeLoading) return this.eyeLoading;
    this.eyeLoading = (async () => {
      const base = import.meta.env.BASE_URL || './';
      const baseUrl = base.endsWith('/') ? base : `${base}/`;
      for (const kind of ['seaweed', 'fence', 'cute', 'trueeye', 'falseeye'] as const) {
        if (this.eyeContainers.has(kind)) continue;
        try {
          const container = await SceneLoader.LoadAssetContainerAsync(
            `${baseUrl}${EYE_MODEL_FOLDERS[kind]}`,
            EYE_MODEL_FILES[kind],
            this.scene
          );
          const entries = container.instantiateModelsToScene(undefined, false);
          const modelRoot = entries.rootNodes[0] as TransformNode | undefined;
          let height = 1;
          if (modelRoot) {
            const { min, max } = modelRoot.getHierarchyBoundingVectors(true);
            height = max.y - min.y;
          }
          entries.animationGroups.forEach((group) => group.dispose());
          entries.rootNodes.forEach((node) => node.dispose());
          const targetHeight =
            EYE_MODEL_HEIGHTS[kind] * (kind === 'fence' ? FENCE_MODEL_SCALE : 1);
          this.eyeScales.set(
            kind,
            height > 0 ? targetHeight / height : 1
          );
          this.eyeContainers.set(kind, container);
          if (kind === 'fence') this.applyFenceModel();
        } catch (error) {
          this.eyeLoadFailed = true;
          console.warn(`Failed loading eye model [${kind}].`, error);
        }
      }

      if (this.lastState) {
        this.eyeDecorKey = '';
        this.updateEyeDecorations(this.lastState);
      }
    })();
    return this.eyeLoading;
  }

  private applyFenceModel(): void {
    const container = this.eyeContainers.get('fence');
    if (!container) return;
    for (const mesh of container.meshes) {
      const material = mesh.material;
      if (!(material instanceof PBRMaterial)) continue;
      material.albedoColor =
        this.fenceModel === 'light'
          ? new Color3(1.6, 1.5, 1.35)
          : Color3.White();
    }
  }

  private createEyeDecoration(kind: EyeModelKind): TransformNode | null {
    const container = this.eyeContainers.get(kind);
    if (!container) return null;

    const holder = new TransformNode(`eye-${kind}-${this.eyeModelSeed++}`, this.scene);
    const entries = container.instantiateModelsToScene(
      (source) => `${source}-eye-${this.eyeModelSeed++}`,
      false
    );
    entries.animationGroups.forEach((group) => group.dispose());
    const root = entries.rootNodes[0] as TransformNode | undefined;
    if (!root) {
      holder.dispose();
      return null;
    }

    root.parent = holder;
    const scale = this.eyeScales.get(kind) ?? 1;
    root.scaling.setAll(scale);
    const { min, max } = root.getHierarchyBoundingVectors(true);
    root.position.set(
      -(min.x + max.x) / 2,
      -min.y,
      -(min.z + max.z) / 2
    );
    for (const mesh of root.getChildMeshes(false)) {
      mesh.isPickable = false;
    }
    if (root instanceof Mesh) root.isPickable = false;
    return holder;
  }

  private updateEyeDecorations(state: RenderState): void {
    const analysis = this.eyeAnalysis;
    const needsEyeDecor =
      state.trueEyeModel !== 'off' ||
      state.showFalseEyeModels ||
      state.wallModel === 'seaweed';
    const fences =
      state.wallModel === 'fence' && state.fenceModel !== 'none'
        ? this.connectedLibertyFences(state.goban)
        : [];

    if (!needsEyeDecor && fences.length === 0) {
      this.clearEyeDecorations();
      this.eyeDecorKey = '';
      return;
    }

    const key = [
      state.wallModel,
      state.fenceModel,
      state.trueEyeModel,
      state.showFalseEyeModels ? 'falseeye' : '',
      ...fences.map(
        (placement) =>
          `${placement.x.toFixed(2)}:${placement.z.toFixed(2)}:${placement.angle.toFixed(2)}`
      ),
      ...(analysis?.groups ?? []).map(
        (group) => `${group.color}:${group.eyes.join(',')}:${group.pair.join(',')}`
      )
    ].join('|');
    if (key === this.eyeDecorKey) return;

    const missing: EyeModelKind[] = [];
    if (
      state.wallModel !== 'off' &&
      state.wallModel !== 'fence' &&
      !this.eyeContainers.has(state.wallModel)
    ) {
      missing.push(state.wallModel);
    }
    if (
      state.wallModel === 'fence' &&
      state.fenceModel !== 'none' &&
      !this.eyeContainers.has('fence')
    ) {
      missing.push('fence');
    }
    if (state.trueEyeModel !== 'off' && !this.eyeContainers.has(state.trueEyeModel)) {
      missing.push(state.trueEyeModel);
    }
    if (state.showFalseEyeModels && !this.eyeContainers.has('falseeye')) {
      missing.push('falseeye');
    }
    if (missing.length > 0) {
      this.clearEyeDecorations();
      this.eyeDecorKey = '';
      if (!this.eyeLoading && !this.eyeLoadFailed) void this.ensureEyeModels();
      return;
    }

    this.clearEyeDecorations();
    const n = this.size;

    for (const placement of fences) {
      const model = this.createEyeDecoration('fence');
      if (!model) continue;
      model.position.set(placement.x, 0.02, placement.z);
      model.rotation.y = placement.angle;
      this.eyeDecorations.push(model);
    }

    if (analysis) {
      for (const group of analysis.groups) {
        if (state.trueEyeModel !== 'off') {
          for (const eye of group.eyes) {
            const model = this.createEyeDecoration(state.trueEyeModel);
            if (!model) continue;
            const row = Math.floor(eye / n);
            const col = eye % n;
            model.position.set(
              this.worldCoordinateX(col),
              0.025,
              this.worldCoordinateZ(row)
            );
            this.eyeDecorations.push(model);
          }
        }

        if (state.showFalseEyeModels) {
          for (const eye of group.falseEyes) {
            const model = this.createEyeDecoration('falseeye');
            if (!model) continue;
            const row = Math.floor(eye / n);
            const col = eye % n;
            model.position.set(
              this.worldCoordinateX(col),
              0.025,
              this.worldCoordinateZ(row)
            );
            this.eyeDecorations.push(model);
          }
        }

        if (state.wallModel === 'seaweed') {
          const [first, second] = group.pair;
          const firstRow = Math.floor(first / n);
          const firstCol = first % n;
          const secondRow = Math.floor(second / n);
          const secondCol = second % n;
          const ax = this.worldCoordinateX(firstCol);
          const az = this.worldCoordinateZ(firstRow);
          const bx = this.worldCoordinateX(secondCol);
          const bz = this.worldCoordinateZ(secondRow);
          const dx = bx - ax;
          const dz = bz - az;
          const length = Math.hypot(dx, dz) || 1;

          const model = this.createEyeDecoration('seaweed');
          if (model) {
            model.position.set(
              (ax + bx) / 2 - (dz / length) * 0.16,
              0.02,
              (az + bz) / 2 + (dx / length) * 0.16
            );
            this.eyeDecorations.push(model);
          }
        }
      }
    }

    this.eyeDecorKey = key;
  }

  private connectedLibertyFences(
    goban: Goban
  ): Array<{ x: number; z: number; angle: number }> {
    const n = goban.size;
    const placements: Array<{ x: number; z: number; angle: number }> = [];
    const seenGroups = new Uint8Array(goban.area);
    const seenEdges = new Set<number>();

    for (let index = 0; index < goban.area; index++) {
      const color = goban.board[index];
      if ((color !== BLACK && color !== WHITE) || seenGroups[index]) continue;
      const group = goban.groupAt(index);
      for (const stone of group.stones) seenGroups[stone] = 1;

      for (const liberty of group.liberties) {
        const row = Math.floor(liberty / n);
        const col = liberty % n;
        const neighbors: number[] = [];
        if (col + 1 < n) neighbors.push(liberty + 1);
        if (row + 1 < n) neighbors.push(liberty + n);

        for (const neighbor of neighbors) {
          if (!group.liberties.has(neighbor)) continue;
          const low = Math.min(liberty, neighbor);
          const high = Math.max(liberty, neighbor);
          const edgeKey = low * goban.area + high;
          if (seenEdges.has(edgeKey)) continue;
          seenEdges.add(edgeKey);

          const neighborRow = Math.floor(neighbor / n);
          const neighborCol = neighbor % n;
          const ax = this.worldCoordinateX(col);
          const az = this.worldCoordinateZ(row);
          const bx = this.worldCoordinateX(neighborCol);
          const bz = this.worldCoordinateZ(neighborRow);
          const dx = bx - ax;
          const dz = bz - az;
          placements.push({
            x: (ax + bx) / 2,
            z: (az + bz) / 2,
            angle: Math.atan2(dx, dz)
          });
        }
      }
    }

    return placements;
  }

  private clearEyeDecorations(): void {
    for (const node of this.eyeDecorations) node.dispose();
    this.eyeDecorations = [];
  }

  private syncPieces(state: RenderState): void {
    const { goban } = state;
    const n = goban.size;
    const moveDelta = this.lastMoveNumber < 0 ? 0 : goban.moveNumber - this.lastMoveNumber;
    const isNewMove = moveDelta === 1;
    const libertyCounts = this.countGroupLiberties(goban);

    for (let index = 0; index < n * n; index++) {
      const color = goban.board[index];
      const existing = this.pieces.get(index);
      const pending = this.pendingPlacements.get(index);

      if (pending && pending.color !== color) {
        pending.cancel();
      }

      if (color === BLACK || color === WHITE) {
        if (this.pendingPlacements.has(index)) continue;

        const { rank, dead } = this.rankFor(index, color, state);
        const alert = dead ? null : this.alertForLiberties(libertyCounts.get(index) ?? 0);
        if (existing) existing.alert = alert;
        if (
          !existing ||
          existing.color !== color ||
          existing.rank !== rank ||
          existing.dead !== dead
        ) {
          const wasExisting = !!existing;
          if (existing) this.disposePiece(existing.root);
          const row = Math.floor(index / n);
          const col = index % n;
          const targetX = this.worldCoordinateX(col);
          const targetZ = this.worldCoordinateZ(row);
          const targetY = 0.03;
          const isJustPlaced = isNewMove && index === state.goban.lastMove && !wasExisting;

          if (isJustPlaced) {
            const isOpponentMove =
              state.opponentColor !== null && color === state.opponentColor;
            this.startStoneArrival(
              index,
              color,
              new Vector3(targetX, targetY, targetZ),
              isOpponentMove,
              () => this.completeStoneArrival(index, color, targetX, targetY, targetZ, isOpponentMove)
            );
            continue;
          }

          const root = this.createPieceNode(rank, color, index, dead);
          root.position.set(targetX, targetY, targetZ);
          this.pieces.set(index, { root, rank, color, dead, alert });
        }
      } else if (existing) {
        if (isNewMove) this.beginCaptureEffect(existing, state.captureEffect);
        else this.disposePiece(existing.root);
        this.pieces.delete(index);
      }
    }

    this.updateLastMoveMarker(state, isNewMove);
    this.lastMoveNumber = goban.moveNumber;
  }

  private rankFor(index: number, color: number, state: RenderState): { rank: number; dead: boolean } {
    const ownership = state.evaluation?.ownership[index] ?? 0;
    return pieceRank(ownership, color, index === state.goban.lastMove, state.goban.size);
  }

  private countGroupLiberties(goban: Goban): Map<number, number> {
    const counts = new Map<number, number>();
    const seen = new Uint8Array(goban.area);
    for (let index = 0; index < goban.area; index++) {
      const color = goban.board[index];
      if ((color !== BLACK && color !== WHITE) || seen[index]) continue;
      const group = goban.groupAt(index);
      const liberties = group.liberties.size;
      for (const stone of group.stones) {
        seen[stone] = 1;
        counts.set(stone, liberties);
      }
    }
    return counts;
  }

  private alertForLiberties(liberties: number): AlertAnimation | null {
    if (liberties === 1) return 'run';
    if (liberties === 2) return 'walk';
    return null;
  }

  private animateAlertPieces(): void {
    const now = performance.now() / 1000;
    for (const [index, piece] of this.pieces) {
      const animation = this.pieceAnimations.get(piece.root.uniqueId)?.[0];
      if (!this.animationsEnabled || !piece.alert) {
        if (animation) animation.speedRatio = IDLE_ANIMATION_SPEED;
        piece.root.position.y = 0.03;
        piece.root.rotation.z = 0;
        continue;
      }

      if (piece.alert === 'run') {
        if (animation) animation.speedRatio = RUN_ANIMATION_SPEED;
        const phase = now * 9 + index;
        piece.root.position.y = 0.03 + Math.abs(Math.sin(phase)) * 0.06;
        piece.root.rotation.z = Math.sin(phase) * 0.08;
      } else {
        if (animation) animation.speedRatio = WALK_ANIMATION_SPEED;
        const phase = now * 4 + index;
        piece.root.position.y = 0.03 + Math.abs(Math.sin(phase)) * 0.03;
        piece.root.rotation.z = Math.sin(phase) * 0.045;
      }
    }
  }

  private updateLastMoveMarker(state: RenderState, isNewMove: boolean): void {
    const last = state.goban.lastMove;
    this.drawCoordinates(last);

    if (last === null) {
      this.lastMoveEmphasis = 1;
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
    const isOpponentMove =
      state.opponentColor !== null && state.goban.board[last] === state.opponentColor;
    this.lastMoveEmphasis = isOpponentMove ? 1.3 : 1;
    this.glowLayer.intensity = 0.75;

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
    const palette = boardPalette(this.boardColor);

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

      ctx.fillStyle = isColActive ? palette.coordActive : palette.coord;
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

      ctx.fillStyle = isRowActive ? palette.coordActive : palette.coord;
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
    const emphasis = this.lastMoveEmphasis;

    this.lastMoveRing.scaling.set(pop * shimmer * emphasis, 1, pop * shimmer * emphasis);
    this.lastMoveGlow.scaling.setAll(emphasis * (1 + 0.08 * Math.sin(t * 4)));

    const beaconBaseY = 1.48;
    this.lastMoveBeacon.position.y = beaconBaseY + 0.07 * Math.sin(t * 3.8);
    this.lastMoveBeacon.rotation.y = t * 2.2;
    this.lastMoveBeacon.rotation.z = 0.12 * Math.sin(t * 1.6);
    this.lastMoveBeacon.scaling.setAll(pop * emphasis * (1 + 0.08 * Math.sin(t * 5)));

    this.lastMovePillar.scaling.x = emphasis * (1 + 0.12 * Math.sin(t * 4));
    this.lastMovePillar.scaling.z = emphasis * (1 + 0.12 * Math.sin(t * 4));

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

  setDeadStoneStyle(style: DeadStoneStyle): void {
    if (this.deadStoneStyle === style) return;
    this.cancelCaptureEffects();
    this.deadStoneStyle = style;
    this.pieces.forEach((piece) => this.disposePiece(piece.root));
    this.pieces.clear();
    if (this.lastState) {
      this.syncPieces(this.lastState);
    }
  }

  setBoardColor(color: BoardColor): void {
    this.boardColor = color;
    const palette = boardPalette(color);
    const surface = Color3.FromHexString(palette.surface);
    this.woodMaterial.diffuseColor = surface;
    this.woodMaterial.emissiveColor = surface.scale(0.04);
    this.starMaterial.diffuseColor = Color3.FromHexString(palette.star);
    if (this.gridMesh) {
      this.gridMesh.color = Color3.FromHexString(palette.grid);
    }
    this.drawCoordinates(this.lastState?.goban.lastMove ?? null);
  }

  private createPieceNode(rank: number, color: number, index: number, dead: boolean): TransformNode {
    const wrapper = new TransformNode(`piece-${index}`, this.scene);
    if (dead) {
      if (this.deadStoneStyle === 'stone') {
        this.buildStone(wrapper, color);
      } else {
        this.buildDeadCube(wrapper, color);
      }
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

    if (this.animationsEnabled && entries.animationGroups.length > 0) {
      const idle =
        entries.animationGroups.find((group) => /idle/i.test(group.name)) ??
        entries.animationGroups[0];
      for (const group of entries.animationGroups) {
        if (group !== idle) group.dispose();
      }
      idle.speedRatio = IDLE_ANIMATION_SPEED;
      idle.start(true);
      this.pieceAnimations.set(wrapper.uniqueId, [idle]);
    } else {
      entries.animationGroups.forEach((group) => group.dispose());
    }

    const meshes = root.getChildMeshes(false);
    if (root instanceof Mesh) meshes.push(root);
    const originalColors = ORIGINAL_COLOR_STYLES.has(this.currentStyle);
    const playerColor = this.perspective === 'black' ? BLACK : WHITE;
    for (const mesh of meshes) {
      if (originalColors) {
        if (color !== playerColor) {
          mesh.material =
            this.currentStyle === 'quirky-animals'
              ? color === WHITE
                ? this.quirkyWhiteMaterial
                : this.quirkyBlackMaterial
              : color === WHITE
                ? this.animalWhiteMaterial
                : this.animalBlackMaterial;
        }
      } else {
        mesh.material = color === BLACK ? this.blackMaterial : this.whiteMaterial;
      }
      mesh.isPickable = false;
    }

    const metrics = this.styleMetrics.get(this.currentStyle)?.get(file);
    const { min, max } = root.getHierarchyBoundingVectors(true);
    const animal = this.styleAnimals.get(this.currentStyle)?.get(file);
    const scaleMultiplier =
      (PIECE_SCALE_MULTIPLIERS[this.currentStyle]?.[file] ?? 1) *
      (animal ? ANIMAL_SCALE_MULTIPLIERS[animal] ?? 1 : 1);
    const scale =
      (metrics?.scale ?? 1.05 / (max.y - min.y || 1)) * scaleMultiplier;
    root.scaling.setAll(scale);

    const offset = PIECE_CENTER_OFFSETS[this.currentStyle]?.[file];
    if (metrics) {
      root.position.set(
        -metrics.centerX * scaleMultiplier + (offset?.x ?? 0),
        -metrics.baseY * scaleMultiplier,
        -metrics.centerZ * scaleMultiplier + (offset?.z ?? 0)
      );
    } else {
      const centered = root.getHierarchyBoundingVectors(true);
      const centerX = (centered.min.x + centered.max.x) / 2;
      const centerZ = (centered.min.z + centered.max.z) / 2;
      root.position.set(
        -centerX + (offset?.x ?? 0),
        -centered.min.y,
        -centerZ + (offset?.z ?? 0)
      );
    }

    return wrapper;
  }

  private disposePiece(root: TransformNode): void {
    const groups = this.pieceAnimations.get(root.uniqueId);
    if (groups) {
      for (const group of groups) group.dispose();
      this.pieceAnimations.delete(root.uniqueId);
    }
    root.dispose();
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
    color: number,
    dramatic = false
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
      dramatic ? 280 : 160,
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

    particles.minSize = dramatic ? 0.07 : 0.05;
    particles.maxSize = dramatic ? 0.26 : 0.18;
    particles.minLifeTime = 0.28;
    particles.maxLifeTime = 0.65;
    particles.emitRate = dramatic ? 240 : 140;
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

  private startStoneArrival(
    index: number,
    color: number,
    target: Vector3,
    dramatic: boolean,
    onLanded: () => void
  ): void {
    const stone = new TransformNode(`arrival-stone-${index}-${this.effectSeed++}`, this.scene);
    this.buildStone(stone, color);

    const start = this.placementStartPoint(target, dramatic);
    const control = new Vector3(
      (start.x + target.x) / 2,
      Math.max(start.y, target.y) + (dramatic ? 2.6 : 1.7),
      (start.z + target.z) / 2
    );
    const duration = dramatic ? 900 : 680;
    const fromScale = dramatic ? 1.12 : 0.95;

    stone.position.copyFrom(start);
    stone.scaling.setAll(fromScale);

    let trail: { stop: () => void; dispose: () => void } | null = null;
    try {
      trail = this.spawnPlacementTrail(stone, color, dramatic);
    } catch {
      // Particles are purely cosmetic.
    }

    const startedAt = performance.now();
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      trail?.stop();
      trail?.dispose();
      stone.dispose();
      this.pendingPlacements.delete(index);
    };

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      if (finished) return;
      const t = Math.min(1, (performance.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const inv = 1 - eased;
      stone.position.x =
        inv * inv * start.x + 2 * inv * eased * control.x + eased * eased * target.x;
      stone.position.y =
        inv * inv * start.y + 2 * inv * eased * control.y + eased * eased * target.y;
      stone.position.z =
        inv * inv * start.z + 2 * inv * eased * control.z + eased * eased * target.z;
      stone.scaling.setAll(fromScale + (1 - fromScale) * eased);
      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        cleanup();
        onLanded();
      }
    });

    this.pendingPlacements.set(index, {
      root: stone,
      color,
      cancel: () => {
        this.scene.onBeforeRenderObservable.remove(observer);
        cleanup();
      }
    });
  }

  private placementStartPoint(target: Vector3, dramatic: boolean): Vector3 {
    const half = (this.size - 1) / 2;
    const camera = this.camera.position;
    let awayX = -camera.x;
    let awayZ = -camera.z;
    const length = Math.hypot(awayX, awayZ);
    if (length < 0.001) {
      awayX = 0;
      awayZ = 1;
    } else {
      awayX /= length;
      awayZ /= length;
    }
    const margin = dramatic ? 9.0 : 5.5;
    const lateral = (target.x * -awayZ + target.z * awayX) * 0.3;
    return new Vector3(
      awayX * (half + margin) - awayZ * lateral,
      target.y + (dramatic ? 4.4 : 2.9),
      awayZ * (half + margin) + awayX * lateral
    );
  }

  private completeStoneArrival(
    index: number,
    color: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    dramatic: boolean
  ): void {
    const state = this.lastState;
    if (!state || state.goban.board[index] !== color) return;

    const { rank, dead } = this.rankFor(index, color, state);
    const root = this.createPieceNode(rank, color, index, dead);
    root.position.set(targetX, targetY, targetZ);
    const replaced = this.pieces.get(index);
    if (replaced) this.disposePiece(replaced.root);
    const alert = dead
      ? null
      : this.alertForLiberties(state.goban.groupAt(index).liberties.size);
    this.pieces.set(index, { root, rank, color, dead, alert });
    this.animatePieceEntrance(index, root, dramatic);

    const pieceColor = color === WHITE ? WHITE_MOVE_COLOR : BLACK_MOVE_COLOR;
    if (dramatic) {
      this.spawnBurst(new Vector3(targetX, 0.16, targetZ), pieceColor, 150, 5.2, 1.6);
      this.spawnBurst(new Vector3(targetX, 0.05, targetZ), pieceColor, 70, 2.4, 1.25, true);
      this.spawnShockwave(new Vector3(targetX, 0.04, targetZ), pieceColor, 1.6, 720);
      this.spawnImpactBeam(new Vector3(targetX, 0.04, targetZ), pieceColor);
      window.setTimeout(() => {
        try {
          const live = this.lastState;
          if (!live || live.goban.board[index] !== color) return;
          this.spawnShockwave(new Vector3(targetX, 0.04, targetZ), pieceColor, 1.0, 520);
        } catch {
          // The scene may already be disposed.
        }
      }, 150);
    } else {
      this.spawnBurst(new Vector3(targetX, 0.16, targetZ), pieceColor, 54, 2.8);
      this.spawnShockwave(new Vector3(targetX, 0.04, targetZ), pieceColor);
    }
    this.lastMovePulseAt = performance.now();
  }

  private animatePieceEntrance(index: number, root: TransformNode, dramatic: boolean): void {
    const base = root.scaling.clone();
    const from = dramatic ? 0.4 : 0.7;
    const duration = dramatic ? 320 : 220;
    const startedAt = performance.now();
    root.scaling.set(base.x * from, base.y * from, base.z * from);

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      if (this.pieces.get(index)?.root !== root) {
        this.scene.onBeforeRenderObservable.remove(observer);
        return;
      }
      const t = Math.min(1, (performance.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const overshoot = 1 + (dramatic ? 0.2 : 0.1) * Math.sin(t * Math.PI);
      const scale = (from + (1 - from) * eased) * overshoot;
      root.scaling.set(base.x * scale, base.y * scale, base.z * scale);
      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        root.scaling.copyFrom(base);
      }
    });
  }

  private beginCaptureEffect(piece: PieceHandle, effect: CaptureEffect): void {
    if (effect === 'dissolve') {
      this.beginDissolveCapture(piece);
    } else if (effect === 'height') {
      this.beginHeightCapture(piece);
    } else {
      this.explodePiece(piece);
    }
  }

  private cancelCaptureEffects(): void {
    for (const cleanup of [...this.captureCleanups]) cleanup();
    this.captureCleanups.clear();
  }

  private beginDissolveCapture(piece: PieceHandle): void {
    const position = piece.root.position.clone();
    const color =
      piece.color === BLACK ? new Color3(1.0, 0.55, 0.12) : new Color3(0.45, 0.82, 1.0);
    this.spawnBurst(position.add(new Vector3(0, 0.24, 0)), color, 36, 2.0, 0.7);

    const clones: Material[] = [];
    const plugins: DissolveMaterialPlugin[] = [];
    const meshes = piece.root.getChildMeshes(false);
    if (piece.root instanceof Mesh) meshes.push(piece.root);
    for (const mesh of meshes) {
      const material = mesh.material;
      if (!material) continue;
      const clone = material.clone(`${material.name}-dissolve-${this.effectSeed++}`);
      if (!clone) continue;
      mesh.material = clone;
      clones.push(clone);
      plugins.push(new DissolveMaterialPlugin(clone));
    }

    const duration = 700;
    let elapsed = 0;
    let finished = false;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      if (finished) return;
      elapsed += Math.min(50, this.engine.getDeltaTime());
      const t = Math.min(1, elapsed / duration);
      const eased = t * t;
      for (const plugin of plugins) plugin.progress = eased;
      if (t >= 1) cleanup();
    });

    const cleanup = () => {
      if (finished) return;
      finished = true;
      this.scene.onBeforeRenderObservable.remove(observer);
      for (const clone of clones) clone.dispose();
      this.disposePiece(piece.root);
      this.captureCleanups.delete(cleanup);
    };
    this.captureCleanups.add(cleanup);
  }

  private beginHeightCapture(piece: PieceHandle): void {
    const position = piece.root.position.clone();
    const baseScale = piece.root.scaling.clone();
    const color =
      piece.color === BLACK ? new Color3(0.88, 0.62, 0.3) : new Color3(0.72, 0.84, 0.95);
    this.spawnBurst(position.add(new Vector3(0, 0.08, 0)), color, 26, 1.2, 0.55);

    const duration = 600;
    let elapsed = 0;
    let finished = false;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      if (finished) return;
      elapsed += Math.min(50, this.engine.getDeltaTime());
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      piece.root.scaling.y = baseScale.y * (1 - eased);
      piece.root.position.y = position.y - 0.06 * eased;
      if (t >= 1) cleanup();
    });

    const cleanup = () => {
      if (finished) return;
      finished = true;
      this.scene.onBeforeRenderObservable.remove(observer);
      this.disposePiece(piece.root);
      this.captureCleanups.delete(cleanup);
    };
    this.captureCleanups.add(cleanup);
  }

  private explodePiece(piece: PieceHandle): void {
    const position = piece.root.position.clone();
    const color =
      piece.color === BLACK ? new Color3(1.0, 0.36, 0.08) : new Color3(0.5, 0.86, 1.0);
    this.spawnBurst(position.add(new Vector3(0, 0.24, 0)), color, 95, 4.6);
    this.spawnShards(position, piece.color);
    this.spawnShockwave(position, color);
    this.disposePiece(piece.root);
  }

  private spawnBurst(
    position: Vector3,
    color: Color3,
    count: number,
    power: number,
    sizeScale = 1,
    fountain = false
  ): void {
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
    particles.minSize = 0.05 * sizeScale;
    particles.maxSize = 0.16 * sizeScale;
    particles.minLifeTime = fountain ? 0.5 : 0.35;
    particles.maxLifeTime = fountain ? 1.15 : 0.8;
    particles.emitRate = 0;
    particles.manualEmitCount = count;
    particles.blendMode = ParticleSystem.BLENDMODE_ADD;
    particles.direction1 = fountain
      ? new Vector3(-0.7, 2.4, -0.7)
      : new Vector3(-power, 1.2, -power);
    particles.direction2 = fountain
      ? new Vector3(0.7, 5.2, 0.7)
      : new Vector3(power, power + 2.2, power);
    particles.minEmitPower = fountain ? 0.4 : 0.6;
    particles.maxEmitPower = power;
    particles.gravity = new Vector3(0, fountain ? -5.5 : -7, 0);
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

  private spawnShockwave(
    position: Vector3,
    color: Color3,
    scale = 1,
    duration = 500
  ): void {
    const material = new StandardMaterial(`shock-material-${this.effectSeed++}`, this.scene);
    material.diffuseColor = Color3.Black();
    material.emissiveColor = color.clone();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.alpha = 0.75;
    material.backFaceCulling = false;

    const ring = MeshBuilder.CreateTorus(
      `shock-ring-${this.effectSeed++}`,
      { diameter: 0.7 * scale, thickness: 0.05 * Math.max(1, scale), tessellation: 32 },
      this.scene
    );
    ring.material = material;
    ring.position.copyFrom(position);
    ring.position.y += 0.06;
    ring.isPickable = false;

    const start = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = (performance.now() - start) / duration;
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

  private spawnImpactBeam(position: Vector3, color: Color3): void {
    const material = new StandardMaterial(`impact-beam-material-${this.effectSeed++}`, this.scene);
    material.diffuseColor = Color3.Black();
    material.emissiveColor = color.clone();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.alpha = 0.85;
    material.backFaceCulling = false;

    const height = 3.4;
    const beam = MeshBuilder.CreateCylinder(
      `impact-beam-${this.effectSeed++}`,
      { height, diameterTop: 0.04, diameterBottom: 0.42, tessellation: 24 },
      this.scene
    );
    beam.material = material;
    beam.position.set(position.x, height / 2, position.z);
    beam.isPickable = false;

    const start = performance.now();
    const duration = 640;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) {
        if (observer) this.scene.onBeforeRenderObservable.remove(observer);
        beam.dispose();
        material.dispose();
        return;
      }
      const fade = 1 - t;
      const widen = 1 + t * 1.1;
      material.alpha = 0.85 * fade * fade;
      beam.scaling.set(widen, 1 - t * 0.25, widen);
      beam.position.y = (height * (1 - t * 0.25)) / 2;
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
    this.updateOrthoBounds();
  };

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.pendingPlacements.forEach((pending) => pending.cancel());
    this.pendingPlacements.clear();
    this.scene.dispose();
    this.engine.dispose();
  }
}
