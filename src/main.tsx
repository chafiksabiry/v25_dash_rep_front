import './public-path';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

/**
 * Thin qiankun entry — keeps bootstrap under single-spa's 4s limit.
 * The heavy React tree loads only on mount (separate chunk).
 */
export async function bootstrap() {
  return Promise.resolve();
}

export async function mount(props: { container?: HTMLElement }) {
  const { renderApp } = await import('./app-mount');
  renderApp(props);
  return Promise.resolve();
}

export async function unmount(props: { container?: HTMLElement }) {
  const { unmountApp } = await import('./app-mount');
  unmountApp(props);
  return Promise.resolve();
}

export async function update(_props: { container?: HTMLElement }) {
  return Promise.resolve();
}

// Standalone dev / direct open of the microfrontend URL
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  const boot = () => import('./app-mount').then((m) => m.renderApp({}));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot().catch((err) =>
      console.error('[repdashboard] Standalone boot failed:', err)
    );
  }
}
