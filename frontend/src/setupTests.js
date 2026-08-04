import '@testing-library/jest-dom/vitest';

// jsdom no implementa ResizeObserver, que usa Recharts internamente.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
