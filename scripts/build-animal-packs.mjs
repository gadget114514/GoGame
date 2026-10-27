import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { KHRTextureTransform } from '@gltf-transform/extensions';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROOT = path.join(ROOT, 'public', 'assets', 'chess');
const IO = new NodeIO().registerExtensions([KHRTextureTransform]);

const PIECES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

const KENNEY = {
  out: path.join(OUT_ROOT, 'kenney-pets'),
  source: path.join(ROOT, '3d', 'kenney_cube-pets_1.0', 'Models', 'GLB format'),
  animals: {
    pawn: 'animal-bee.glb',
    knight: 'animal-bunny.glb',
    bishop: 'animal-penguin.glb',
    rook: 'animal-elephant.glb',
    queen: 'animal-cat.glb',
    king: 'animal-lion.glb'
  }
};

const ANIMAL_BAG = {
  out: path.join(OUT_ROOT, 'animal-bag'),
  source: path.join(ROOT, '3d', 'animal_bag', 'scene.gltf'),
  anchors: {
    top: [
      { x: -6, name: 'dog' },
      { x: -3, name: 'duck' },
      { x: 0, name: 'rabbit' },
      { x: 3, name: 'panda' },
      { x: 6, name: 'penguin' }
    ],
    bottom: [
      { x: -6, name: 'pig' },
      { x: -3, name: 'bee' },
      { x: 0, name: 'cat' },
      { x: 3, name: 'elephant' },
      { x: 6, name: 'chicken' }
    ]
  },
  animals: {
    pawn: 'bee',
    knight: 'rabbit',
    bishop: 'penguin',
    rook: 'elephant',
    queen: 'cat',
    king: 'dog'
  }
};

const QUIRKY = {
  out: path.join(OUT_ROOT, 'quirky-animals'),
  source: path.join(ROOT, '3d', 'quirky-series-free-animals-pack', 'source', 'FREE Animals.fbx'),
  animals: {
    pawn: 'Sparrow',
    knight: 'Herring',
    bishop: 'Colobus',
    rook: 'Muskrat',
    queen: 'Gecko',
    king: 'Pudu'
  }
};

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function keepWithAncestors(node, keep) {
  let current = node;
  while (current) {
    keep.add(current);
    current = current.getParentNode();
  }
}

function keepSubtree(node, keep) {
  if (!node) return;
  keep.add(node);
  for (const child of node.listChildren()) keepSubtree(child, keep);
}

function removeUnusedNodes(root, keep) {
  for (const node of root.listNodes()) {
    if (!keep.has(node)) node.dispose();
  }
}

function isolateSingleRoot(root) {
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  if (!scene) throw new Error('Scene is missing');
  for (const other of root.listScenes()) {
    if (other !== scene) other.dispose();
  }
  root.setDefaultScene(scene);
  return scene;
}

function dropAnimations(root) {
  for (const animation of root.listAnimations()) animation.dispose();
}

function keepIdleAnimation(root, keep) {
  const animations = root.listAnimations();
  if (!animations.length) return;
  const idle = animations.find((animation) => /idle/i.test(animation.getName() ?? '')) ?? animations[0];
  for (const animation of animations) {
    if (animation !== idle) animation.dispose();
  }
  for (const channel of idle.listChannels()) {
    const target = channel.getTargetNode();
    if (!target || !keep.has(target)) channel.dispose();
  }
  if (idle.listChannels().length === 0) idle.dispose();
  else idle.setName('Idle');
}

function renameRootNode(root, name) {
  const scene = root.getDefaultScene();
  const top = scene?.listChildren()[0];
  if (top) top.setName(name);
}

async function finalize(doc, destination, piece, options = {}) {
  const root = doc.getRoot();
  if (options.keepIdleAnimation && options.keep) {
    keepIdleAnimation(root, options.keep);
  } else {
    dropAnimations(root);
  }
  isolateSingleRoot(root);
  renameRootNode(root, piece);
  await prune()(doc);
  ensureDir(path.dirname(destination));
  await IO.write(destination, doc);
  console.log(`  wrote ${path.relative(ROOT, destination)}`);
}

async function buildKenney() {
  console.log('Building Kenney Cube Pets...');
  ensureDir(KENNEY.out);
  for (const piece of PIECES) {
    const file = KENNEY.animals[piece];
    const source = path.join(KENNEY.source, file);
    if (!existsSync(source)) {
      console.warn(`  missing ${source}`);
      continue;
    }
    const doc = await IO.read(source);
    await finalize(doc, path.join(KENNEY.out, `${piece}.glb`), piece);
  }
}

function closestAnchor(anchors, x) {
  return anchors.reduce((best, item) =>
    Math.abs(item.x - x) < Math.abs(best.x - x) ? item : best
  ).name;
}

async function buildAnimalBag() {
  console.log('Building Animal Bag...');
  ensureDir(ANIMAL_BAG.out);
  for (const piece of PIECES) {
    const wanted = ANIMAL_BAG.animals[piece];
    const doc = await IO.read(ANIMAL_BAG.source);
    const root = doc.getRoot();
    const keep = new Set();
    const scene = root.getDefaultScene() ?? root.listScenes()[0];

    for (const node of root.listNodes()) {
      if (!node.getMesh()) continue;
      const [, y] = node.getWorldTranslation();
      const anchors = y >= 0 ? ANIMAL_BAG.anchors.top : ANIMAL_BAG.anchors.bottom;
      const [x] = node.getWorldTranslation();
      if (closestAnchor(anchors, x) === wanted) keepWithAncestors(node, keep);
    }

    if (keep.size === 0) {
      console.warn(`  no nodes found for ${wanted}`);
      doc.dispose();
      continue;
    }

    removeUnusedNodes(root, keep);
    if (scene) scene.setName(piece);
    await finalize(doc, path.join(ANIMAL_BAG.out, `${piece}.glb`), piece);
  }
}

function findFbx2Gltf() {
  const local = path.join(ROOT, 'node_modules', 'fbx2gltf', 'bin');
  const platform = process.platform === 'win32' ? 'Windows_NT' : process.platform === 'darwin' ? 'Darwin' : 'Linux';
  const binary = process.platform === 'win32' ? 'FBX2glTF.exe' : 'FBX2glTF';
  const candidate = path.join(local, platform, binary);
  return existsSync(candidate) ? candidate : null;
}

async function convertQuirkyFbx() {
  const converter = findFbx2Gltf();
  if (!converter) {
    throw new Error('fbx2gltf binary not found. Run npm install first.');
  }
  const tempDir = mkdtempSync(path.join(tmpdir(), 'gogame-quirky-'));
  const output = path.join(tempDir, 'quirky');
  console.log('Converting Quirky FBX to glTF...');
  const result = spawnSync(
    converter,
    ['--binary', '--input', QUIRKY.source, '--output', output],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) throw new Error('FBX conversion failed');
  return { glb: `${output}.glb`, tempDir };
}

function keepRigForMesh(node, keep) {
  const skin = node.getSkin();
  if (!skin) return;
  keepWithAncestors(skin.getSkeleton?.() ?? node, keep);
  for (const joint of skin.listJoints()) {
    keepWithAncestors(joint, keep);
  }
  for (const joint of skin.listJoints()) {
    keepSubtree(joint, keep);
  }
}

async function findLod0Node(root, animalName) {
  const candidates = root.listNodes().filter((node) => {
    const name = node.getName() ?? '';
    return node.getMesh() && name.startsWith(`${animalName}_LOD1`);
  });
  if (!candidates.length) return null;
  const exact = candidates.find((node) => node.getName() === `${animalName}_LOD1`);
  return exact ?? candidates[0];
}

async function buildQuirky() {
  console.log('Building Quirky Animals...');
  ensureDir(QUIRKY.out);
  const { glb, tempDir } = await convertQuirkyFbx();
  try {
    for (const piece of PIECES) {
      const animal = QUIRKY.animals[piece];
      const doc = await IO.read(glb);
      const root = doc.getRoot();
      const meshNode = await findLod0Node(root, animal);
      if (!meshNode) {
        console.warn(`  no LOD0 node found for ${animal}`);
        doc.dispose();
        continue;
      }

      const keep = new Set();
      keepWithAncestors(meshNode, keep);
      keepRigForMesh(meshNode, keep);
      removeUnusedNodes(root, keep);
      await finalize(doc, path.join(QUIRKY.out, `${piece}.glb`), piece, {
        keepIdleAnimation: true,
        keep
      });
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

await buildAnimalBag();
await buildKenney();
await buildQuirky();
console.log('Done.');
