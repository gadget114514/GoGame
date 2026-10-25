export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.__ELECTRON__ === true;
}
