export type FenceModel = 'dark' | 'light' | 'none';

export const FENCE_MODELS: readonly FenceModel[] = ['dark', 'light', 'none'];

export function isFenceModel(value: unknown): value is FenceModel {
  return typeof value === 'string' && FENCE_MODELS.includes(value as FenceModel);
}
