import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma before importing the module under test
import '../mocks/prisma';
import { prismaMock } from '../mocks/prisma';

import { getUncollectedPhotos } from '@/lib/photo-queries';

describe('getUncollectedPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls findMany with none filter on album-kind collections', async () => {
    prismaMock.photo.findMany.mockResolvedValue([]);

    await getUncollectedPhotos();

    expect(prismaMock.photo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          collections: {
            none: {
              collection: {
                kind: 'album',
              },
            },
          },
        },
      })
    );
  });

  it('orders by createdAt descending (newest first)', async () => {
    prismaMock.photo.findMany.mockResolvedValue([]);

    await getUncollectedPhotos();

    expect(prismaMock.photo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          createdAt: 'desc',
        },
      })
    );
  });

  it('returns whatever findMany resolves (pass-through)', async () => {
    const fakePhotos = [
      { id: 'p1', title: 'Sunset', createdAt: new Date('2025-01-02') },
      { id: 'p2', title: 'Beach', createdAt: new Date('2025-01-01') },
    ];
    prismaMock.photo.findMany.mockResolvedValue(fakePhotos as never);

    const result = await getUncollectedPhotos();

    expect(result).toBe(fakePhotos);
  });

  it('returns photos that are only in surface collections (memorial/featured)', async () => {
    // A photo with only surface memberships has NO album-kind CollectionPhoto rows,
    // so the `none` filter over album-kind collections passes → it IS returned.
    // This test verifies the filter targets only "album" kind.
    const surfaceOnlyPhoto = [{ id: 'p-surface', title: 'Memorial Photo', createdAt: new Date() }];
    prismaMock.photo.findMany.mockResolvedValue(surfaceOnlyPhoto as never);

    const result = await getUncollectedPhotos();

    // The query uses kind: "album" — surface photos are not excluded
    expect(result).toEqual(surfaceOnlyPhoto);

    // Verify the where clause does NOT target "surface" kind
    const callArg = prismaMock.photo.findMany.mock.calls[0][0] as {
      where: { collections: { none: { collection: { kind: string } } } };
    };
    expect(callArg.where.collections.none.collection.kind).toBe('album');
  });

  it('returns empty array when no uncollected photos exist', async () => {
    prismaMock.photo.findMany.mockResolvedValue([]);

    const result = await getUncollectedPhotos();

    expect(result).toEqual([]);
  });
});
