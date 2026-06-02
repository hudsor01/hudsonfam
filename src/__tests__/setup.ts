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
