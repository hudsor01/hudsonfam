import { describe, it, expect } from 'vitest';

/**
 * Tests for the published-resolution logic in src/app/api/photos/route.ts.
 *
 * We test `resolvePublished` directly — it is a pure exported function that
 * encapsulates all three canonical rules (VIS-01 / VIS-02):
 *   1. collectionId present → always true
 *   2. missing `published` field → true (default-public)
 *   3. explicit "false" with no collection → false (owner override path)
 */
import { resolvePublished } from '@/app/api/photos/route';

describe('resolvePublished (photos route, VIS-01 / VIS-02)', () => {
  describe('missing published field (default-public)', () => {
    it('returns true when publishedRaw is null and no collectionId', () => {
      expect(resolvePublished(null, null)).toBe(true);
    });

    it('returns true when publishedRaw is "on" (checkbox form value)', () => {
      expect(resolvePublished('on', null)).toBe(true);
    });

    it('returns true when publishedRaw is "true" (string)', () => {
      expect(resolvePublished('true', null)).toBe(true);
    });
  });

  describe('explicit false override (owner override path)', () => {
    it('returns false when publishedRaw is "false" and no collectionId', () => {
      expect(resolvePublished('false', null)).toBe(false);
    });
  });

  describe('collectionId forces published true (collection-forced publish)', () => {
    it('returns true when collectionId is provided, regardless of missing published field', () => {
      expect(resolvePublished(null, 'col-123')).toBe(true);
    });

    it('returns true when collectionId is provided and published is "false"', () => {
      // Collection membership overrides the explicit false — this is the
      // existing "collection forces published" rule that must be preserved.
      expect(resolvePublished('false', 'col-123')).toBe(true);
    });

    it('returns true when collectionId is provided and published is "true"', () => {
      expect(resolvePublished('true', 'col-123')).toBe(true);
    });
  });
});
