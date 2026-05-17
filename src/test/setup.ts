import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'sessionStorage', {
  value: window.sessionStorage,
  configurable: true,
});
