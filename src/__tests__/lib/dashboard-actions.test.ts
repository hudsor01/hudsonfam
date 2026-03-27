import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/cache and next/navigation
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

// Mock session/auth
const mockRequireRole = vi.fn();

vi.mock('@/lib/session', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

// Mock prisma
import '../mocks/prisma';
import { prismaMock } from '../mocks/prisma';

// Import the actions under test
import {
  createPost,
  updatePost,
  deletePost,
  createAlbum,
  updateAlbum,
  createEvent,
  updateEvent,
  deleteEvent,
  createUpdate,
  deleteUpdate,
  updateUserRole,
  banUser,
  unbanUser,
  deletePhoto,
  createInvite,
  deleteInvite,
} from '@/lib/dashboard-actions';

const fakeSession = {
  user: { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'owner' },
  session: { id: 'session-1', token: 'token' },
};

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

describe('dashboard-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeSession);
    prismaMock.blogPost.create.mockResolvedValue({ id: 'post-1' });
    prismaMock.blogPost.update.mockResolvedValue({ id: 'post-1' });
    prismaMock.blogPost.delete.mockResolvedValue({ id: 'post-1' });
    prismaMock.blogPost.findUnique.mockResolvedValue(null);
    prismaMock.album.create.mockResolvedValue({ id: 'album-1' });
    prismaMock.album.update.mockResolvedValue({ id: 'album-1' });
    prismaMock.event.create.mockResolvedValue({ id: 'event-1' });
    prismaMock.event.update.mockResolvedValue({ id: 'event-1' });
    prismaMock.event.delete.mockResolvedValue({ id: 'event-1' });
    prismaMock.familyUpdate.create.mockResolvedValue({ id: 'update-1' });
    prismaMock.familyUpdate.delete.mockResolvedValue({ id: 'update-1' });
    prismaMock.user.update.mockResolvedValue({ id: 'user-1' });
    prismaMock.photo.delete.mockResolvedValue({ id: 'photo-1' });
    prismaMock.inviteToken.create.mockResolvedValue({ id: 'invite-1', token: 'abc-123' });
    prismaMock.inviteToken.delete.mockResolvedValue({ id: 'invite-1' });
  });

  // --------------- Posts ---------------

  describe('createPost', () => {
    it('creates a post with correct data', async () => {
      const formData = makeFormData({
        title: 'My Post',
        slug: 'my-post',
        excerpt: 'A short excerpt',
        tags: 'family, travel',
        status: 'PUBLISHED',
        coverImage: '/images/cover.jpg',
      });

      await createPost(formData);

      expect(mockRequireRole).toHaveBeenCalledWith(['owner', 'admin', 'member']);
      expect(prismaMock.blogPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'My Post',
          slug: 'my-post',
          excerpt: 'A short excerpt',
          tags: ['family', 'travel'],
          status: 'PUBLISHED',
          coverImage: '/images/cover.jpg',
          authorId: 'user-1',
        }),
      });
      // publishedAt should be set when status is PUBLISHED
      const callArgs = prismaMock.blogPost.create.mock.calls[0][0].data;
      expect(callArgs.publishedAt).toBeInstanceOf(Date);
    });

    it('sets publishedAt to null for DRAFT status', async () => {
      const formData = makeFormData({
        title: 'Draft Post',
        slug: 'draft-post',
        tags: '',
        status: 'DRAFT',
      });

      await createPost(formData);

      const callArgs = prismaMock.blogPost.create.mock.calls[0][0].data;
      expect(callArgs.publishedAt).toBeNull();
      expect(callArgs.status).toBe('DRAFT');
    });

    it('revalidates paths and redirects after creation', async () => {
      const formData = makeFormData({ title: 'Post', slug: 'post', tags: '' });

      await createPost(formData);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/posts');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/blog');
      expect(mockRedirect).toHaveBeenCalledWith('/dashboard/posts');
    });

    it('handles empty tags gracefully', async () => {
      const formData = makeFormData({ title: 'Post', slug: 'post', tags: '' });

      await createPost(formData);

      const callArgs = prismaMock.blogPost.create.mock.calls[0][0].data;
      expect(callArgs.tags).toEqual([]);
    });
  });

  describe('updatePost', () => {
    it('updates post fields', async () => {
      prismaMock.blogPost.findUnique.mockResolvedValue({
        id: 'post-1',
        status: 'DRAFT',
        publishedAt: null,
      });

      const formData = makeFormData({
        title: 'Updated Title',
        slug: 'updated-slug',
        excerpt: 'Updated excerpt',
        tags: 'updated',
        status: 'DRAFT',
      });

      await updatePost('post-1', formData);

      expect(prismaMock.blogPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          slug: 'updated-slug',
        }),
      });
    });

    it('sets publishedAt when transitioning from DRAFT to PUBLISHED', async () => {
      prismaMock.blogPost.findUnique.mockResolvedValue({
        id: 'post-1',
        status: 'DRAFT',
        publishedAt: null,
      });

      const formData = makeFormData({
        title: 'Title',
        slug: 'slug',
        tags: '',
        status: 'PUBLISHED',
      });

      await updatePost('post-1', formData);

      const callArgs = prismaMock.blogPost.update.mock.calls[0][0].data;
      expect(callArgs.publishedAt).toBeInstanceOf(Date);
    });

    it('keeps existing publishedAt when already PUBLISHED', async () => {
      const existingDate = new Date('2026-01-01');
      prismaMock.blogPost.findUnique.mockResolvedValue({
        id: 'post-1',
        status: 'PUBLISHED',
        publishedAt: existingDate,
      });

      const formData = makeFormData({
        title: 'Title',
        slug: 'slug',
        tags: '',
        status: 'PUBLISHED',
      });

      await updatePost('post-1', formData);

      const callArgs = prismaMock.blogPost.update.mock.calls[0][0].data;
      expect(callArgs.publishedAt).toEqual(existingDate);
    });
  });

  describe('deletePost', () => {
    it('deletes post and revalidates paths', async () => {
      await deletePost('post-1');

      expect(mockRequireRole).toHaveBeenCalledWith(['owner', 'admin']);
      expect(prismaMock.blogPost.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/posts');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/blog');
    });
  });

  // --------------- Albums ---------------

  describe('createAlbum', () => {
    it('creates an album with correct data', async () => {
      const formData = makeFormData({
        title: 'Vacation',
        slug: 'vacation',
        description: 'Our trip',
        date: '2026-06-15',
      });

      await createAlbum(formData);

      expect(prismaMock.album.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Vacation',
          slug: 'vacation',
          description: 'Our trip',
        }),
      });
      const callArgs = prismaMock.album.create.mock.calls[0][0].data;
      expect(callArgs.date).toBeInstanceOf(Date);
    });

    it('handles null date', async () => {
      const formData = makeFormData({
        title: 'Album',
        slug: 'album',
      });

      await createAlbum(formData);

      const callArgs = prismaMock.album.create.mock.calls[0][0].data;
      expect(callArgs.date).toBeNull();
    });

    it('redirects to albums page', async () => {
      const formData = makeFormData({ title: 'Album', slug: 'album' });

      await createAlbum(formData);

      expect(mockRedirect).toHaveBeenCalledWith('/dashboard/photos/albums');
    });
  });

  describe('updateAlbum', () => {
    it('updates album fields including coverPhotoId', async () => {
      const formData = makeFormData({
        title: 'Updated Album',
        slug: 'updated-album',
        description: 'Updated description',
        date: '2026-07-01',
        coverPhotoId: 'photo-5',
      });

      await updateAlbum('album-1', formData);

      expect(prismaMock.album.update).toHaveBeenCalledWith({
        where: { id: 'album-1' },
        data: expect.objectContaining({
          title: 'Updated Album',
          coverPhotoId: 'photo-5',
        }),
      });
    });
  });

  // --------------- Events ---------------

  describe('createEvent', () => {
    it('creates an event with all-day flag', async () => {
      const formData = makeFormData({
        title: 'Birthday Party',
        description: 'A fun party',
        location: 'Dallas, TX',
        startDate: '2026-07-15',
        allDay: 'on',
        visibility: 'FAMILY',
      });

      await createEvent(formData);

      expect(prismaMock.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Birthday Party',
          description: 'A fun party',
          location: 'Dallas, TX',
          allDay: true,
          visibility: 'FAMILY',
          createdById: 'user-1',
        }),
      });
    });

    it('defaults allDay to false when not checked', async () => {
      const formData = makeFormData({
        title: 'Meeting',
        startDate: '2026-07-15T14:00',
      });

      await createEvent(formData);

      const callArgs = prismaMock.event.create.mock.calls[0][0].data;
      expect(callArgs.allDay).toBe(false);
    });

    it('defaults visibility to PUBLIC', async () => {
      const formData = makeFormData({
        title: 'Public Event',
        startDate: '2026-07-15',
      });

      await createEvent(formData);

      const callArgs = prismaMock.event.create.mock.calls[0][0].data;
      expect(callArgs.visibility).toBe('PUBLIC');
    });

    it('handles optional end date', async () => {
      const formData = makeFormData({
        title: 'Event',
        startDate: '2026-07-15',
        endDate: '2026-07-16',
      });

      await createEvent(formData);

      const callArgs = prismaMock.event.create.mock.calls[0][0].data;
      expect(callArgs.endDate).toBeInstanceOf(Date);
    });

    it('redirects to events dashboard', async () => {
      const formData = makeFormData({
        title: 'Event',
        startDate: '2026-07-15',
      });

      await createEvent(formData);

      expect(mockRedirect).toHaveBeenCalledWith('/dashboard/events');
    });
  });

  describe('deleteEvent', () => {
    it('deletes event and revalidates', async () => {
      await deleteEvent('event-1');

      expect(mockRequireRole).toHaveBeenCalledWith(['owner', 'admin']);
      expect(prismaMock.event.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/events');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/events');
    });
  });

  // --------------- Family Updates ---------------

  describe('createUpdate', () => {
    it('creates a family update', async () => {
      const formData = makeFormData({
        content: 'We had a great day!',
        visibility: 'PUBLIC',
      });

      await createUpdate(formData);

      expect(prismaMock.familyUpdate.create).toHaveBeenCalledWith({
        data: {
          content: 'We had a great day!',
          visibility: 'PUBLIC',
          postedById: 'user-1',
        },
      });
    });
  });

  describe('deleteUpdate', () => {
    it('deletes update (owner/admin only)', async () => {
      await deleteUpdate('update-1');

      expect(mockRequireRole).toHaveBeenCalledWith(['owner', 'admin']);
      expect(prismaMock.familyUpdate.delete).toHaveBeenCalledWith({ where: { id: 'update-1' } });
    });
  });

  // --------------- Members ---------------

  describe('updateUserRole', () => {
    it('requires owner role and updates user', async () => {
      await updateUserRole('user-2', 'admin');

      expect(mockRequireRole).toHaveBeenCalledWith(['owner']);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { role: 'admin' },
      });
    });
  });

  describe('banUser', () => {
    it('bans user with reason', async () => {
      await banUser('user-2', 'spam');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { banned: true, banReason: 'spam' },
      });
    });

    it('handles empty reason', async () => {
      await banUser('user-2', '');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { banned: true, banReason: null },
      });
    });
  });

  describe('unbanUser', () => {
    it('clears ban fields', async () => {
      await unbanUser('user-2');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { banned: false, banReason: null, banExpires: null },
      });
    });
  });

  describe('deletePhoto', () => {
    it('deletes photo (owner/admin only)', async () => {
      await deletePhoto('photo-1');

      expect(mockRequireRole).toHaveBeenCalledWith(['owner', 'admin']);
      expect(prismaMock.photo.delete).toHaveBeenCalledWith({ where: { id: 'photo-1' } });
    });
  });

  // --------------- Invites ---------------

  describe('createInvite', () => {
    it('creates invite with 7-day expiry', async () => {
      const formData = makeFormData({
        email: 'friend@example.com',
        role: 'member',
      });

      const token = await createInvite(formData);

      expect(mockRequireRole).toHaveBeenCalledWith(['owner']);
      expect(prismaMock.inviteToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'friend@example.com',
          role: 'member',
          createdBy: 'user-1',
        }),
      });

      // Token should be a UUID string
      const callArgs = prismaMock.inviteToken.create.mock.calls[0][0].data;
      expect(callArgs.token).toBeDefined();
      expect(typeof callArgs.token).toBe('string');

      // Expiry should be ~7 days from now
      const expiresAt = callArgs.expiresAt as Date;
      const daysDiff = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(6.9);
      expect(daysDiff).toBeLessThan(7.1);
    });

    it('defaults role to member', async () => {
      const formData = makeFormData({ email: 'friend@example.com' });

      await createInvite(formData);

      const callArgs = prismaMock.inviteToken.create.mock.calls[0][0].data;
      expect(callArgs.role).toBe('member');
    });

    it('returns generated token', async () => {
      const formData = makeFormData({ email: 'friend@example.com' });

      const token = await createInvite(formData);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('deleteInvite', () => {
    it('deletes invite (owner only)', async () => {
      await deleteInvite('invite-1');

      expect(mockRequireRole).toHaveBeenCalledWith(['owner']);
      expect(prismaMock.inviteToken.delete).toHaveBeenCalledWith({ where: { id: 'invite-1' } });
    });
  });

  // --------------- Auth checks ---------------

  describe('auth enforcement', () => {
    it('calls requireRole before creating post', async () => {
      mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
      const formData = makeFormData({ title: 'Post', slug: 'post', tags: '' });

      await expect(createPost(formData)).rejects.toThrow('Unauthorized');
      expect(prismaMock.blogPost.create).not.toHaveBeenCalled();
    });

    it('calls requireRole before deleting event', async () => {
      mockRequireRole.mockRejectedValue(new Error('Unauthorized'));

      await expect(deleteEvent('event-1')).rejects.toThrow('Unauthorized');
      expect(prismaMock.event.delete).not.toHaveBeenCalled();
    });

    it('owner-only actions reject non-owners', async () => {
      mockRequireRole.mockRejectedValue(new Error('Forbidden'));

      await expect(updateUserRole('user-2', 'admin')).rejects.toThrow('Forbidden');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});
