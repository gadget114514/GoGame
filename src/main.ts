import './style.css';
import { GameController } from './ui/GameController';
import { isElectron } from './platform/env';

if (!isElectron() && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      // PWA registration is optional.
    });
}

const controller = new GameController();

if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
  (window as unknown as { __game?: GameController }).__game = controller;
}

void controller.start();
