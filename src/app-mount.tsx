import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

let root: ReturnType<typeof createRoot> | null = null;

/** Qiankun passes a host container div — it usually has no inner #root. */
function resolveRootElement(container?: HTMLElement): HTMLElement | null {
  if (container) {
    const inner = container.querySelector('#root');
    return (inner as HTMLElement | null) ?? container;
  }
  return document.getElementById('root');
}

export function renderApp(props: { container?: HTMLElement }) {
  const rootElement = resolveRootElement(props.container);
  if (!rootElement) {
    console.warn('[repdashboard] Root element not found');
    return;
  }
  if (!root) {
    root = createRoot(rootElement);
  }
  root.render(<App />);
}

export function unmountApp(props: { container?: HTMLElement }) {
  const rootElement = resolveRootElement(props.container);
  if (rootElement && root) {
    root.unmount();
    root = null;
  }
}
