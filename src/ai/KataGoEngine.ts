import * as tf from '@tensorflow/tfjs';
import { BLACK, type Goban } from '../game/Goban';
import type { BoardSize } from '../game/BoardSize';
import { modelUrl, type AILevel } from './registry';
import { selectMove } from './select';
import {
  buildInputs,
  extractOwnership,
  extractPolicy,
  softmaxPolicy,
  CHANNELS,
  GLOBAL_INPUTS,
  type TensorLayout
} from './tensor';

export interface Evaluation {
  /** Move probabilities, length size*size + 1 (last entry is pass). */
  policy: Float32Array;
  /** Ownership per intersection in [-1, 1], positive = Black. */
  ownership: Float32Array;
  /** KataGo score lead in points, positive = Black. */
  scoreLead: number;
  /** Black win probability in [0, 1]. */
  winrate: number;
  /** Whether the evaluation came from a padded 19x19 model. */
  padded: boolean;
}

export interface MoveResult {
  move: number | null;
  evaluation: Evaluation;
}

interface ResolvedModel {
  url: string;
  grid: BoardSize;
}

/**
 * Thin wrapper around the KataGo TensorFlow.js graph models.
 * Dedicated per-size models are used when present in `public/models`;
 * otherwise the 19x19 model is used with padded inference.
 */
export class KataGoEngine {
  private models = new Map<string, tf.GraphModel>();
  private pending = new Map<string, Promise<tf.GraphModel>>();
  private resolved = new Map<string, ResolvedModel>();
  private backendReady = false;

  async initialize(): Promise<void> {
    if (this.backendReady) return;
    this.backendReady = true;
    try {
      await tf.setBackend('webgl');
      if (tf.getBackend() !== 'webgl') await tf.setBackend('cpu');
    } catch {
      await tf.setBackend('cpu');
    }
    await tf.ready();
  }

  private async modelExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) return false;
      const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
      if (contentType.includes('json')) return true;
      if (contentType && !contentType.includes('html')) return true;

      // Some servers (including Vite's SPA fallback) answer missing files with
      // index.html. Validate the actual payload before trusting the probe.
      const payload = await fetch(url);
      if (!payload.ok) return false;
      const json = (await payload.json()) as { modelTopology?: unknown; weightsManifest?: unknown };
      return Boolean(json.modelTopology || json.weightsManifest);
    } catch {
      return false;
    }
  }

  private async resolve(size: BoardSize, level: AILevel): Promise<ResolvedModel> {
    const key = `${size}/${level}`;
    const cached = this.resolved.get(key);
    if (cached) return cached;

    let resolved: ResolvedModel;
    if (size === 19) {
      resolved = { url: modelUrl(19, level), grid: 19 };
    } else {
      const dedicated = modelUrl(size, level);
      resolved = (await this.modelExists(dedicated))
        ? { url: dedicated, grid: size }
        : { url: modelUrl(19, level), grid: 19 };
    }
    this.resolved.set(key, resolved);
    return resolved;
  }

  private async loadModel(url: string): Promise<tf.GraphModel> {
    const loaded = this.models.get(url);
    if (loaded) return loaded;

    const inFlight = this.pending.get(url);
    if (inFlight) return inFlight;

    const promise = tf.loadGraphModel(url);
    this.pending.set(url, promise);
    try {
      const model = await promise;
      this.models.set(url, model);
      return model;
    } finally {
      this.pending.delete(url);
    }
  }

  async evaluate(goban: Goban, level: AILevel = 'dan'): Promise<Evaluation> {
    await this.initialize();
    let resolved = await this.resolve(goban.size, level);
    let model: tf.GraphModel;
    try {
      model = await this.loadModel(resolved.url);
    } catch (error) {
      if (resolved.grid === 19) throw error;
      console.warn(`Failed to load ${resolved.url}; using the 19x19 model instead.`, error);
      resolved = { url: modelUrl(19, level), grid: 19 };
      this.resolved.set(`${goban.size}/${level}`, resolved);
      model = await this.loadModel(resolved.url);
    }

    const { bin, global, layout } = buildInputs(goban, resolved.grid);
    const area = resolved.grid * resolved.grid;

    const binTensor = tf.tensor3d(bin, [1, area, CHANNELS]);
    const globalTensor = tf.tensor2d(global, [1, GLOBAL_INPUTS]);
    const inputs: Record<string, tf.Tensor> = {};
    inputs[model.inputNodes[0]] = binTensor;
    inputs[model.inputNodes[1]] = globalTensor;

    let results: tf.Tensor | tf.Tensor[];
    try {
      results = await model.executeAsync(inputs);
    } finally {
      binTensor.dispose();
      globalTensor.dispose();
    }

    const list = Array.isArray(results) ? results : [results];
    try {
      const names = model.outputNodes;
      const find = (needle: string) => names.findIndex((name) => name.includes(needle));
      const policyIndex = find('policy_output');
      const ownershipIndex = find('ownership_output');
      const miscIndex = find('miscvalues_output');
      const valueIndex = find('value_output');

      const policyRaw = new Float32Array(
        (await list[policyIndex].data()) as Float32Array
      );
      const ownershipRaw = new Float32Array(
        (await list[ownershipIndex].data()) as Float32Array
      );
      const miscRaw = miscIndex >= 0 ? ((await list[miscIndex].data()) as Float32Array) : null;
      const valueRaw = valueIndex >= 0 ? ((await list[valueIndex].data()) as Float32Array) : null;

      const grid = resolved.grid;
      const passIndex = grid * grid;
      // The first plane of the [1, 2, grid*grid+1] policy head is the policy
      // for the side to move; the second plane is not used.
      const policyGrid = new Float32Array(grid * grid + 1);
      policyGrid.set(policyRaw.subarray(0, grid * grid + 1));
      const policy = extractPolicy(softmaxPolicy(policyGrid), layout);

      const rawOwnership = extractOwnership(ownershipRaw, layout);
      const ownership = new Float32Array(rawOwnership.length);
      // KataGo ownership is from the perspective of the player to move.
      const flip = goban.side !== BLACK;
      for (let i = 0; i < rawOwnership.length; i++) {
        ownership[i] = flip ? -rawOwnership[i] : rawOwnership[i];
      }

      const scoreToMove = (miscRaw?.[2] ?? 0) * 20;
      const scoreLead = goban.side === BLACK ? scoreToMove : -scoreToMove;

      // value_output holds unnormalized win/loss/draw logits for the side to move.
      let winrate = 0.5;
      if (valueRaw && valueRaw.length >= 2) {
        const maxValue = Math.max(valueRaw[0], valueRaw[1], valueRaw[2] ?? -Infinity);
        const win = Math.exp(valueRaw[0] - maxValue);
        const loss = Math.exp(valueRaw[1] - maxValue);
        const draw = valueRaw.length > 2 ? Math.exp(valueRaw[2] - maxValue) : 1;
        const total = win + loss + draw;
        // value[0] = self win, value[1] = self loss; self loss is Black's win.
        const ratio = goban.side === BLACK ? win / total : loss / total;
        winrate = Math.min(1, Math.max(0, ratio));
      }

      return {
        policy,
        ownership,
        scoreLead,
        winrate,
        padded: (layout as TensorLayout).padded
      };
    } finally {
      for (const tensor of list) tensor.dispose();
    }
  }

  async chooseMove(goban: Goban, level: AILevel = 'dan'): Promise<MoveResult> {
    const evaluation = await this.evaluate(goban, level);
    return { move: selectMove(goban, evaluation), evaluation };
  }

  isLoaded(size: BoardSize, level: AILevel): boolean {
    const resolved = this.resolved.get(`${size}/${level}`);
    return !!resolved && this.models.has(resolved.url);
  }
}
