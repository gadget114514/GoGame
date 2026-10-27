const GLB_CACHE_VERSION_KEY = 'gogame:glbCacheVersion';
const GLB_CACHE_VERSION = '1';

export async function clearGlbCacheOnce(): Promise<void> {
  if (typeof caches === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(GLB_CACHE_VERSION_KEY) === GLB_CACHE_VERSION) return;
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        let path = '';
        try {
          path = new URL(request.url).pathname;
        } catch {
          continue;
        }
        if (path.toLowerCase().endsWith('.glb')) {
          await cache.delete(request);
        }
      }
    }
    localStorage.setItem(GLB_CACHE_VERSION_KEY, GLB_CACHE_VERSION);
  } catch {
    // Cache cleanup is best-effort.
  }
}
