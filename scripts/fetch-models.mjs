import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'scripts', 'models.config.json');

async function fetchOk(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
}

async function download(url, destination) {
  if (existsSync(destination)) {
    console.log(`exists: ${path.relative(ROOT, destination)}`);
    return;
  }
  const response = await fetchOk(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, buffer);
  console.log(`wrote:  ${path.relative(ROOT, destination)}`);
}

const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));

for (const source of config.sources ?? []) {
  const directory = path.join(
    ROOT,
    'public',
    'models',
    `${source.level}-${source.size}x${source.size}`
  );
  const modelPath = path.join(directory, 'model.json');

  if (existsSync(modelPath)) {
    console.log(`exists: ${path.relative(ROOT, modelPath)}`);
    continue;
  }

  const response = await fetchOk(source.url);
  const text = await response.text();
  mkdirSync(directory, { recursive: true });
  writeFileSync(modelPath, text);
  console.log(`wrote:  ${path.relative(ROOT, modelPath)}`);

  const model = JSON.parse(text);
  const base = source.url.slice(0, source.url.lastIndexOf('/') + 1);
  const shards = new Set();
  for (const group of model.weightsManifest ?? []) {
    for (const shard of group.paths ?? []) shards.add(shard);
  }
  for (const shard of shards) {
    await download(base + shard, path.join(directory, shard));
  }
  try {
    await download(base + 'metadata.json', path.join(directory, 'metadata.json'));
  } catch {
    // metadata.json is optional.
  }
}

if ((config.rawNetworks ?? []).length) {
  console.log('\nDedicated small-board nets (optional, manual conversion):');
  for (const net of config.rawNetworks) {
    console.log(`  ${net.size}x${net.size}: ${net.url}`);
    console.log(`    ${net.note}`);
  }
  console.log(
    '\nWithout dedicated models the app pads 9x9/13x13 boards into the 19x19 net.'
  );
}
