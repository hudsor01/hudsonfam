import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mock setup (must be before imports of modules under test)
// ============================================================

const mockRevalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  cacheLife: () => {},
  cacheTag: () => {},
  unstable_cacheLife: () => {},
  unstable_cacheTag: () => {},
}));

const mockRequireRole = vi.fn();

vi.mock('@/lib/session', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock prisma
import '../mocks/prisma';
import { prismaMock } from '../mocks/prisma';

// ============================================================
// Imports of modules under test
// ============================================================

import {
  addPhotoToCollection,
  removePhotoFromCollection,
  reorderCollectionPhoto,
  setPhotoLayout,
  setPhotoPublished,
  createCollection,
  updateCollection,
  deleteCollection,
} from '@/lib/collection-actions';

// ============================================================
// Helpers
// ============================================================

const fakeSession = {
  user: { id: 'user-1', name: 'Owner', email: 'owner@test.com', role: 'owner' },
  session: { id: 'session-1', token: 'token' },
};

// ============================================================
// Tests
// ============================================================

describe('addPhotoToCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('counts existing photos and uses count as sortOrder', async () => {
    prismaMock.collectionPhoto.count.mockResolvedValue(2);
    prismaMock.collectionPhoto.create.mockResolvedValue({});
    prismaMock.photo.update.mockResolvedValue({});

    await addPhotoToCollection('col1', 'p1');

    expect(prismaMock.collectionPhoto.count).toHaveBeenCalledWith({
      where: { collectionId: 'col1' },
    });
    expect(prismaMock.collectionPhoto.create).toHaveBeenCalledWith({
      data: { collectionId: 'col1', photoId: 'p1', sortOrder: 2 },
    });
  });

  it('sets photo published: true', async () => {
    prismaMock.collectionPhoto.count.mockResolvedValue(0);
    prismaMock.collectionPhoto.create.mockResolvedValue({});
    prismaMock.photo.update.mockResolvedValue({});

    await addPhotoToCollection('col1', 'p1');

    expect(prismaMock.photo.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { published: true },
    });
  });

  it('revalidates surfaces', async () => {
    prismaMock.collectionPhoto.count.mockResolvedValue(0);
    prismaMock.collectionPhoto.create.mockResolvedValue({});
    prismaMock.photo.update.mockResolvedValue({});

    await addPhotoToCollection('col1', 'p1');

    expect(mockRevalidatePath).toHaveBeenCalledWith('/photos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/photos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/richard-hudson-sr');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/');
  });

  it('requires role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(addPhotoToCollection('col1', 'p1')).rejects.toThrow('Forbidden');
    expect(prismaMock.collectionPhoto.create).not.toHaveBeenCalled();
  });
});

describe('removePhotoFromCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('deletes using composite key', async () => {
    prismaMock.collectionPhoto.delete.mockResolvedValue({});

    await removePhotoFromCollection('col1', 'p1');

    expect(prismaMock.collectionPhoto.delete).toHaveBeenCalledWith({
      where: { collectionId_photoId: { collectionId: 'col1', photoId: 'p1' } },
    });
  });

  it('does NOT call photo.update', async () => {
    prismaMock.collectionPhoto.delete.mockResolvedValue({});

    await removePhotoFromCollection('col1', 'p1');

    expect(prismaMock.photo.update).not.toHaveBeenCalled();
  });

  it('revalidates surfaces', async () => {
    prismaMock.collectionPhoto.delete.mockResolvedValue({});

    await removePhotoFromCollection('col1', 'p1');

    expect(mockRevalidatePath).toHaveBeenCalledWith('/photos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/photos');
  });

  it('requires role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(removePhotoFromCollection('col1', 'p1')).rejects.toThrow('Forbidden');
    expect(prismaMock.collectionPhoto.delete).not.toHaveBeenCalled();
  });
});

describe('reorderCollectionPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('calls $transaction with an array of updates in order', async () => {
    // collectionPhoto.update returns something per call; $transaction resolves
    prismaMock.collectionPhoto.update
      .mockResolvedValueOnce({ sortOrder: 0 })
      .mockResolvedValueOnce({ sortOrder: 1 })
      .mockResolvedValueOnce({ sortOrder: 2 });
    prismaMock.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.all(ops as Promise<unknown>[])
    );

    await reorderCollectionPhoto('col1', ['pB', 'pA', 'pC']);

    // $transaction was called once with an array
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    // collectionPhoto.update was called 3 times
    expect(prismaMock.collectionPhoto.update).toHaveBeenCalledTimes(3);

    // 1st call: pB → sortOrder 0
    expect(prismaMock.collectionPhoto.update).toHaveBeenNthCalledWith(1, {
      where: { collectionId_photoId: { collectionId: 'col1', photoId: 'pB' } },
      data: { sortOrder: 0 },
    });

    // 3rd call: pC → sortOrder 2
    expect(prismaMock.collectionPhoto.update).toHaveBeenNthCalledWith(3, {
      where: { collectionId_photoId: { collectionId: 'col1', photoId: 'pC' } },
      data: { sortOrder: 2 },
    });
  });

  it('requires role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(reorderCollectionPhoto('col1', ['pA'])).rejects.toThrow('Forbidden');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe('setPhotoLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('updates layout for valid value', async () => {
    prismaMock.collectionPhoto.update.mockResolvedValue({});

    await setPhotoLayout('col1', 'p1', 'feature');

    expect(prismaMock.collectionPhoto.update).toHaveBeenCalledWith({
      where: { collectionId_photoId: { collectionId: 'col1', photoId: 'p1' } },
      data: { layout: 'feature' },
    });
  });

  it('rejects invalid layout with /invalid/i', async () => {
    await expect(setPhotoLayout('col1', 'p1', 'bogus')).rejects.toThrow(/invalid/i);
    expect(prismaMock.collectionPhoto.update).not.toHaveBeenCalled();
  });

  it('accepts all valid layout values', async () => {
    prismaMock.collectionPhoto.update.mockResolvedValue({});

    for (const layout of ['auto', 'wide', 'tall', 'feature']) {
      vi.clearAllMocks();
      mockRequireRole.mockResolvedValue(fakeSession);
      prismaMock.collectionPhoto.update.mockResolvedValue({});
      await expect(setPhotoLayout('col1', 'p1', layout)).resolves.toBeUndefined();
    }
  });

  it('requires role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(setPhotoLayout('col1', 'p1', 'auto')).rejects.toThrow('Forbidden');
  });
});

describe('setPhotoPublished', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('sets published: false', async () => {
    prismaMock.photo.update.mockResolvedValue({});

    await setPhotoPublished('p1', false);

    expect(prismaMock.photo.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { published: false },
    });
  });

  it('sets published: true', async () => {
    prismaMock.photo.update.mockResolvedValue({});

    await setPhotoPublished('p1', true);

    expect(prismaMock.photo.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { published: true },
    });
  });

  it('revalidates surfaces', async () => {
    prismaMock.photo.update.mockResolvedValue({});

    await setPhotoPublished('p1', false);

    expect(mockRevalidatePath).toHaveBeenCalledWith('/photos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/photos');
  });

  it('requires role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(setPhotoPublished('p1', true)).rejects.toThrow('Forbidden');
    expect(prismaMock.photo.update).not.toHaveBeenCalled();
  });
});

describe('createCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('creates with slugified title and default kind album', async () => {
    prismaMock.collection.create.mockResolvedValue({});

    await createCollection({ title: 'Lake Trip 2024' });

    expect(prismaMock.collection.create).toHaveBeenCalledWith({
      data: {
        title: 'Lake Trip 2024',
        slug: 'lake-trip-2024',
        description: null,
        kind: 'album',
      },
    });
  });

  it('creates with kind surface when specified', async () => {
    prismaMock.collection.create.mockResolvedValue({});

    await createCollection({ title: 'My Surface', kind: 'surface' });

    expect(prismaMock.collection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: 'surface' }),
    });
  });

  it('rejects empty title', async () => {
    await expect(createCollection({ title: '  ' })).rejects.toThrow('Title is required');
    expect(prismaMock.collection.create).not.toHaveBeenCalled();
  });

  it('stores description when provided', async () => {
    prismaMock.collection.create.mockResolvedValue({});

    await createCollection({ title: 'Summer', description: 'Family fun' });

    expect(prismaMock.collection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ description: 'Family fun' }),
    });
  });

  it('revalidates /photos and /dashboard/photos', async () => {
    prismaMock.collection.create.mockResolvedValue({});

    await createCollection({ title: 'Test' });

    expect(mockRevalidatePath).toHaveBeenCalledWith('/photos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/photos');
  });

  it('requires role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(createCollection({ title: 'Test' })).rejects.toThrow('Forbidden');
    expect(prismaMock.collection.create).not.toHaveBeenCalled();
  });
});

describe('updateCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('updates title when provided', async () => {
    prismaMock.collection.update.mockResolvedValue({});

    await updateCollection('col1', { title: 'New Title' });

    expect(prismaMock.collection.update).toHaveBeenCalledWith({
      where: { id: 'col1' },
      data: { title: 'New Title' },
    });
  });

  it('updates coverPhotoId when provided', async () => {
    prismaMock.collection.update.mockResolvedValue({});

    await updateCollection('col1', { coverPhotoId: 'photo-99' });

    expect(prismaMock.collection.update).toHaveBeenCalledWith({
      where: { id: 'col1' },
      data: { coverPhotoId: 'photo-99' },
    });
  });

  it('clears coverPhotoId when null passed', async () => {
    prismaMock.collection.update.mockResolvedValue({});

    await updateCollection('col1', { coverPhotoId: null });

    expect(prismaMock.collection.update).toHaveBeenCalledWith({
      where: { id: 'col1' },
      data: { coverPhotoId: null },
    });
  });

  it('requires role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(updateCollection('col1', { title: 'X' })).rejects.toThrow('Forbidden');
    expect(prismaMock.collection.update).not.toHaveBeenCalled();
  });
});

describe('deleteCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
  });

  it('rejects deletion of surface collection with /reserved/i', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'col1', kind: 'surface' });

    await expect(deleteCollection('col1')).rejects.toThrow(/reserved/i);
    expect(prismaMock.collection.delete).not.toHaveBeenCalled();
  });

  it('deletes album collection', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'col1', kind: 'album' });
    prismaMock.collection.delete.mockResolvedValue({});

    await deleteCollection('col1');

    expect(prismaMock.collection.delete).toHaveBeenCalledWith({ where: { id: 'col1' } });
  });

  it('requires owner role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(deleteCollection('col1')).rejects.toThrow('Forbidden');
    expect(prismaMock.collection.findUnique).not.toHaveBeenCalled();
  });

  it('calls requireRole with ["owner"]', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'col1', kind: 'album' });
    prismaMock.collection.delete.mockResolvedValue({});

    await deleteCollection('col1');

    expect(mockRequireRole).toHaveBeenCalledWith(['owner']);
  });

  it('revalidates /photos and /dashboard/photos', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({ id: 'col1', kind: 'album' });
    prismaMock.collection.delete.mockResolvedValue({});

    await deleteCollection('col1');

    expect(mockRevalidatePath).toHaveBeenCalledWith('/photos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/photos');
  });
});
