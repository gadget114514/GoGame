import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FBX2GLTF =
  process.env.FBX2GLTF || 'C:/Users/bluen/.local/bin/FBX2glTF-windows-x64.exe';
const MODELS = path.join(ROOT, 'Dark_Yagami', '3D Chess Pack - Free', 'Models');
const OUT = path.join(ROOT, 'public', 'assets', 'chess');
const PIECES = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

if (!existsSync(FBX2GLTF)) {
  console.error(`FBX2glTF not found at: ${FBX2GLTF}`);
  console.error('Set the FBX2GLTF environment variable to the binary path.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

for (const piece of PIECES) {
  const input = path.join(MODELS, `${piece}.fbx`);
  const output = path.join(OUT, piece.toLowerCase());
  if (!existsSync(input)) {
    console.warn(`skip (missing): ${input}`);
    continue;
  }
  console.log(`convert: ${piece}.fbx`);
  const result = spawnSync(
    FBX2GLTF,
    ['--binary', '--input', input, '--output', output],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    console.error(`failed: ${piece}`);
    process.exitCode = 1;
  }
}
