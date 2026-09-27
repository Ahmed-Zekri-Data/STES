import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount what each test rendered (automatic only with Vitest globals)
afterEach(cleanup);

// jsdom has no IntersectionObserver (framer-motion's useInView needs one):
// report every observed element as visible
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ isIntersecting: true, target }], this); }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
