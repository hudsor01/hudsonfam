// Vitest (unlike Next.js) does NOT auto-load `.env.local` into process.env, so
// DB-gated integration tests would skip even when a connection string exists.
// Load .env.local (then .env) here. Absent in CI → those tests skip cleanly;
// dotenv never overrides vars already set in the environment.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();

import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// `cacheLife()` / `cacheTag()` (the Cache Components directives used by the
// content readers) throw outside Next's `cacheComponents` runtime, which the
// vitest environment doesn't provide. Neutralize just those directives so unit
// tests exercise the data logic; the production build verifies the real cache
// behavior. `revalidatePath`/`revalidateTag` are left intact for action tests.
vi.mock('next/cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/cache')>();
  return {
    ...actual,
    cacheLife: () => {},
    cacheTag: () => {},
    unstable_cacheLife: () => {},
    unstable_cacheTag: () => {},
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
