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
    prismaMock.user.update.mockResolvedValue({ id: 'user-1' });
    prismaMock.photo.delete.mockResolvedValue({ id: 'photo-1' });
    prismaMock.inviteToken.create.mockResolvedValue({ id: 'invite-1', token: 'abc-123' });
    prismaMock.inviteToken.delete.mockResolvedValue({ id: 'invite-1' });
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

      await createInvite(formData);

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
    it('owner-only actions reject non-owners', async () => {
      mockRequireRole.mockRejectedValue(new Error('Forbidden'));

      await expect(updateUserRole('user-2', 'admin')).rejects.toThrow('Forbidden');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});
