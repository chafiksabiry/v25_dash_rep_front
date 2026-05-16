import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

/**
 * React Router basename must match how the app is mounted.
 * If VITE_RUN_MODE and the real URL disagree (e.g. standalone build under /repdashboard/*),
 * no routes match, the catch-all fires with Navigate/replace, and browser back/forward break.
 */
export function getRouterBasename(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_RUN_MODE === 'standalone' ? '/' : '/repdashboard';
  }
  if (qiankunWindow.__POWERED_BY_QIANKUN__) {
    return '/repdashboard';
  }
  const p = window.location.pathname;
  if (p === '/repdashboard' || p.startsWith('/repdashboard/')) {
    return '/repdashboard';
  }
  return '/';
}
