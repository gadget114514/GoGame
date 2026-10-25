import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import { describe, expect, it } from 'vitest';
import { Goban } from '../src/game/Goban';
import {
  CHANNELS,
  buildInputs,
  extractOwnership,
  extractPolicy,
  softmaxPolicy
} from '../src/ai/tensor';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(HERE, '..', 'public');
const RUN = process.env.RUN_MODEL_TESTS === '1';

function contentType(file: string): string {
  if (file.endsWith('.json')) return 'application/json';
  if (file.endsWith('.bin')) return 'application/octet-stream';
  return 'application/octet-stream';
}

describe.skipIf(!RUN)('KataGo model integration', () => {
  it('runs padded inference for 9, 13 and 19', async () => {
    const server = createServer(async (request, response) => {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
      const relative = pathname.replace(/^\/+/, '');
      try {
        const data = await readFile(path.join(PUBLIC, relative));
        response.writeHead(200, { 'content-type': contentType(relative) });
        response.end(data);
      } catch {
        response.writeHead(404);
        response.end('not found');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    try {
      await tf.setBackend('cpu');
      await tf.ready();
      const model = await tf.loadGraphModel(
        `http://127.0.0.1:${port}/models/kyu-19x19/model.json`
      );
      expect(model.inputNodes.length).toBe(2);

      const outputNames = model.outputNodes;
      const find = (needle: string) => {
        const index = outputNames.findIndex((name) => name.includes(needle));
        expect(index).toBeGreaterThanOrEqual(0);
        return index;
      };
      const policyIndex = find('policy_output');
      const ownershipIndex = find('ownership_output');

      for (const size of [9, 13, 19] as const) {
        const goban = new Goban(size, 7);
        goban.play(Math.floor(size / 2) * size + Math.floor(size / 2));
        goban.play(Math.floor(size / 3) * size + Math.floor(size / 3));

        const { bin, global, layout } = buildInputs(goban, 19);
        const area = 19 * 19;
        const inputs: Record<string, tf.Tensor> = {
          [model.inputNodes[0]]: tf.tensor3d(bin, [1, area, CHANNELS]),
          [model.inputNodes[1]]: tf.tensor2d(global, [1, 19])
        };

        const results = (await model.executeAsync(inputs)) as tf.Tensor[];
        try {
          const policyRaw = new Float32Array(
            (await results[policyIndex].data()) as Float32Array
          );
          const ownershipRaw = new Float32Array(
            (await results[ownershipIndex].data()) as Float32Array
          );

          const policyGrid = new Float32Array(19 * 19 + 1);
          policyGrid.set(policyRaw.subarray(0, 19 * 19 + 1));

          const policy = extractPolicy(softmaxPolicy(policyGrid), layout);
          const ownership = extractOwnership(ownershipRaw, layout);

          expect(policy.length).toBe(size * size + 1);
          expect(ownership.length).toBe(size * size);
          expect(ownership.every((value) => Number.isFinite(value))).toBe(true);
          expect(policy.every((value) => Number.isFinite(value))).toBe(true);
          expect(policy.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 2);
        } finally {
          for (const tensor of results) tensor.dispose();
          for (const tensor of Object.values(inputs)) tensor.dispose();
        }
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 120000);
});
