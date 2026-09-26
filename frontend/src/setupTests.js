import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount what each test rendered (automatic only with Vitest globals)
afterEach(cleanup);
