import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma before importing the module under test
import '../mocks/prisma';
import { prismaMock } from '../mocks/prisma';

import { getUncollectedPhotos, getFeaturedPhotos } from '@/lib/photo-queries';
import { FEATURED_SLUG, FEATURED_MAX } from '@/lib/featured';

describe('getFeaturedPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls collection.findUnique with where slug === FEATURED_SLUG', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(null);

    await getFeaturedPhotos();

    expect(prismaMock.collection.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: FEATURED_SLUG },
      })
    );
  });

  it('includes photos ordered by sortOrder asc and capped at FEATURED_MAX', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(null);

    await getFeaturedPhotos();

    expect(prismaMock.collection.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          photos: expect.objectContaining({
            orderBy: { sortOrder: 'asc' },
            take: FEATURED_MAX,
          }),
        },
      })
    );
  });

  it('returns [] when findUnique resolves null (featured collection row absent)', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(null);

    const result = await getFeaturedPhotos();

    expect(result).toEqual([]);
  });

  it('maps CollectionPhoto join rows to Photo records when collection exists', async () => {
    const photo1 = { id: 'p1', thumbnailPath: '/api/images/p1', title: null };
    const photo2 = { id: 'p2', thumbnailPath: '/api/images/p2', title: null };
    prismaMock.collection.findUnique.mockResolvedValue({
      id: 'col1',
      slug: FEATURED_SLUG,
      photos: [
        { id: 'cp1', sortOrder: 0, photo: photo1 },
        { id: 'cp2', sortOrder: 1, photo: photo2 },
      ],
    } as never);

    const result = await getFeaturedPhotos();

    expect(result).toEqual([photo1, photo2]);
  });
});

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
