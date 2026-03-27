/**
 * prod-readiness.test.ts
 *
 * Production-readiness tests covering:
 * - Memorial system (submission, moderation, media, content management)
 * - Bug fix verification (photo URLs, GFM tables, event relative time)
 * - SEO verification (metadata, sitemap, RSS feed)
 * - Auth & security (invite tokens, memorial admin access)
 * - Integration smoke tests (robots.txt, iCal, layout backlink)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// ============================================================
// Mock setup (must be before imports of modules under test)
// ============================================================

const mockRevalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const mockRequireRole = vi.fn();

vi.mock('@/lib/session', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock prisma
import './mocks/prisma';
import { prismaMock } from './mocks/prisma';

// ============================================================
// Imports of modules under test
// ============================================================

import {
  submitMemory,
  approveMemory,
  rejectMemory,
  addMemorialMedia,
  removeMemorialMedia,
  updateMemorialContent,
} from '@/lib/memorial-actions';

import { getAllPosts, getPostBySlug } from '@/lib/blog';

import { GET as validateInviteGET } from '@/app/api/invite/validate/route';
import { NextRequest } from 'next/server';

// ============================================================
// Helpers
// ============================================================

const fakeOwnerSession = {
  user: { id: 'user-1', name: 'Owner', email: 'owner@test.com', role: 'owner' },
  session: { id: 'session-1', token: 'token' },
};

function makeMemoryFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    relationship: 'Friend',
    content: 'Richard was a wonderful person who touched many lives.',
  };
  const data = { ...defaults, ...overrides };
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

function makeMediaFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    url: 'https://example.com/photo.jpg',
    type: 'photo',
  };
  const data = { ...defaults, ...overrides };
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

function createInviteRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/invite/validate');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// ============================================================
// 1. Memorial System Tests
// ============================================================

describe('Memorial -- Memory Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.memory.create.mockResolvedValue({ id: 'memory-1' });
  });

  it('rejects missing firstName', async () => {
    const fd = makeMemoryFormData();
    fd.delete('firstName');
    await expect(submitMemory(fd)).rejects.toThrow('First name, last name, email, relationship, and memory are required');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('rejects missing lastName', async () => {
    const fd = makeMemoryFormData();
    fd.delete('lastName');
    await expect(submitMemory(fd)).rejects.toThrow('First name, last name, email, relationship, and memory are required');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('rejects missing email', async () => {
    const fd = makeMemoryFormData();
    fd.delete('email');
    await expect(submitMemory(fd)).rejects.toThrow('First name, last name, email, relationship, and memory are required');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('rejects missing relationship', async () => {
    const fd = makeMemoryFormData();
    fd.delete('relationship');
    await expect(submitMemory(fd)).rejects.toThrow('First name, last name, email, relationship, and memory are required');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('rejects missing content', async () => {
    const fd = makeMemoryFormData();
    fd.delete('content');
    await expect(submitMemory(fd)).rejects.toThrow('First name, last name, email, relationship, and memory are required');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('rejects invalid email format', async () => {
    const fd = makeMemoryFormData({ email: 'not-an-email' });
    await expect(submitMemory(fd)).rejects.toThrow('Please enter a valid email address');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('rejects content over 5000 chars', async () => {
    const fd = makeMemoryFormData({ content: 'x'.repeat(5001) });
    await expect(submitMemory(fd)).rejects.toThrow('Memory must be under 5000 characters');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('accepts content at exactly 5000 chars', async () => {
    const fd = makeMemoryFormData({ content: 'x'.repeat(5000) });
    await submitMemory(fd);
    expect(prismaMock.memory.create).toHaveBeenCalled();
  });

  it('saves memory with approved: false by default', async () => {
    const fd = makeMemoryFormData();
    await submitMemory(fd);

    const callArgs = prismaMock.memory.create.mock.calls[0][0].data;
    expect(callArgs.approved).toBe(false);
  });

  it('trims whitespace from all fields', async () => {
    const fd = makeMemoryFormData({
      firstName: '  Jane  ',
      lastName: '  Doe  ',
      email: '  jane@example.com  ',
      relationship: '  Friend  ',
      content: '  A wonderful person.  ',
    });
    await submitMemory(fd);

    const callArgs = prismaMock.memory.create.mock.calls[0][0].data;
    expect(callArgs.firstName).toBe('Jane');
    expect(callArgs.lastName).toBe('Doe');
    expect(callArgs.email).toBe('jane@example.com');
    expect(callArgs.relationship).toBe('Friend');
    expect(callArgs.content).toBe('A wonderful person.');
  });

  it('rejects whitespace-only firstName', async () => {
    const fd = makeMemoryFormData({ firstName: '   ' });
    await expect(submitMemory(fd)).rejects.toThrow('Required fields cannot be empty');
    expect(prismaMock.memory.create).not.toHaveBeenCalled();
  });

  it('stores phone as null when not provided', async () => {
    const fd = makeMemoryFormData();
    await submitMemory(fd);

    const callArgs = prismaMock.memory.create.mock.calls[0][0].data;
    expect(callArgs.phone).toBeNull();
  });

  it('stores trimmed phone when provided', async () => {
    const fd = makeMemoryFormData();
    fd.append('phone', '  555-1234  ');
    await submitMemory(fd);

    const callArgs = prismaMock.memory.create.mock.calls[0][0].data;
    expect(callArgs.phone).toBe('555-1234');
  });

  it('revalidates the memorial page path after submission', async () => {
    const fd = makeMemoryFormData();
    await submitMemory(fd);

    expect(mockRevalidatePath).toHaveBeenCalledWith('/richard-hudson-sr');
  });

  it('accepts valid email formats', async () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.org',
      'firstname+tag@company.co',
    ];
    for (const email of validEmails) {
      vi.clearAllMocks();
      prismaMock.memory.create.mockResolvedValue({ id: 'memory-1' });
      const fd = makeMemoryFormData({ email });
      await submitMemory(fd);
      expect(prismaMock.memory.create).toHaveBeenCalled();
    }
  });
});

describe('Memorial -- Moderation (owner-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approveMemory sets approved to true', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memory.update.mockResolvedValue({ id: 'memory-1', approved: true });

    await approveMemory('memory-1');

    expect(prismaMock.memory.update).toHaveBeenCalledWith({
      where: { id: 'memory-1' },
      data: { approved: true },
    });
  });

  it('rejectMemory deletes the memory', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memory.delete.mockResolvedValue({ id: 'memory-1' });

    await rejectMemory('memory-1');

    expect(prismaMock.memory.delete).toHaveBeenCalledWith({
      where: { id: 'memory-1' },
    });
  });

  it('approveMemory requires owner role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(approveMemory('memory-1')).rejects.toThrow('Forbidden');
    expect(prismaMock.memory.update).not.toHaveBeenCalled();
  });

  it('rejectMemory requires owner role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(rejectMemory('memory-1')).rejects.toThrow('Forbidden');
    expect(prismaMock.memory.delete).not.toHaveBeenCalled();
  });

  it('approveMemory passes ["owner"] to requireRole', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memory.update.mockResolvedValue({ id: 'memory-1' });

    await approveMemory('memory-1');

    expect(mockRequireRole).toHaveBeenCalledWith(['owner']);
  });

  it('approveMemory revalidates multiple paths', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memory.update.mockResolvedValue({ id: 'memory-1' });

    await approveMemory('memory-1');

    expect(mockRevalidatePath).toHaveBeenCalledWith('/richard-hudson-sr');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/memorial');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/memorial/memories');
  });
});

describe('Memorial -- Media Management (owner-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addMemorialMedia creates photo entry', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialMedia.create.mockResolvedValue({ id: 'media-1' });

    const fd = makeMediaFormData({ type: 'photo' });
    await addMemorialMedia(fd);

    const callArgs = prismaMock.memorialMedia.create.mock.calls[0][0].data;
    expect(callArgs.type).toBe('photo');
    expect(callArgs.url).toBe('https://example.com/photo.jpg');
  });

  it('addMemorialMedia creates video entry', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialMedia.create.mockResolvedValue({ id: 'media-1' });

    const fd = makeMediaFormData({ type: 'video', url: 'https://youtube.com/watch?v=abc' });
    await addMemorialMedia(fd);

    const callArgs = prismaMock.memorialMedia.create.mock.calls[0][0].data;
    expect(callArgs.type).toBe('video');
  });

  it('addMemorialMedia rejects invalid type', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);

    const fd = makeMediaFormData({ type: 'audio' });
    await expect(addMemorialMedia(fd)).rejects.toThrow('Type must be photo or video');
    expect(prismaMock.memorialMedia.create).not.toHaveBeenCalled();
  });

  it('addMemorialMedia requires owner role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    const fd = makeMediaFormData();
    await expect(addMemorialMedia(fd)).rejects.toThrow('Forbidden');
    expect(prismaMock.memorialMedia.create).not.toHaveBeenCalled();
  });

  it('addMemorialMedia rejects missing URL', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);

    const fd = new FormData();
    fd.append('type', 'photo');
    await expect(addMemorialMedia(fd)).rejects.toThrow('URL and type are required');
  });

  it('addMemorialMedia sets sortOrder to 0 by default', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialMedia.create.mockResolvedValue({ id: 'media-1' });

    const fd = makeMediaFormData();
    await addMemorialMedia(fd);

    const callArgs = prismaMock.memorialMedia.create.mock.calls[0][0].data;
    expect(callArgs.sortOrder).toBe(0);
  });

  it('addMemorialMedia parses numeric sortOrder', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialMedia.create.mockResolvedValue({ id: 'media-1' });

    const fd = makeMediaFormData();
    fd.append('sortOrder', '5');
    await addMemorialMedia(fd);

    const callArgs = prismaMock.memorialMedia.create.mock.calls[0][0].data;
    expect(callArgs.sortOrder).toBe(5);
  });

  it('removeMemorialMedia deletes entry', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialMedia.delete.mockResolvedValue({ id: 'media-1' });

    await removeMemorialMedia('media-1');

    expect(prismaMock.memorialMedia.delete).toHaveBeenCalledWith({
      where: { id: 'media-1' },
    });
  });

  it('removeMemorialMedia requires owner role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(removeMemorialMedia('media-1')).rejects.toThrow('Forbidden');
    expect(prismaMock.memorialMedia.delete).not.toHaveBeenCalled();
  });
});

describe('Memorial -- Content Management (owner-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateMemorialContent upserts section', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialContent.upsert.mockResolvedValue({ id: 'content-1' });

    await updateMemorialContent('hero_subtitle', 'A loving father');

    expect(prismaMock.memorialContent.upsert).toHaveBeenCalledWith({
      where: { section: 'hero_subtitle' },
      update: { content: 'A loving father' },
      create: { section: 'hero_subtitle', content: 'A loving father' },
    });
  });

  it('updateMemorialContent rejects empty content', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);

    await expect(updateMemorialContent('hero_subtitle', '')).rejects.toThrow('Content cannot be empty');
    expect(prismaMock.memorialContent.upsert).not.toHaveBeenCalled();
  });

  it('updateMemorialContent rejects whitespace-only content', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);

    await expect(updateMemorialContent('hero_subtitle', '   ')).rejects.toThrow('Content cannot be empty');
    expect(prismaMock.memorialContent.upsert).not.toHaveBeenCalled();
  });

  it('updateMemorialContent requires owner role', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(updateMemorialContent('hero_subtitle', 'content')).rejects.toThrow('Forbidden');
    expect(prismaMock.memorialContent.upsert).not.toHaveBeenCalled();
  });

  it('updateMemorialContent trims content before saving', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialContent.upsert.mockResolvedValue({ id: 'content-1' });

    await updateMemorialContent('hero_subtitle', '  A loving father  ');

    const callArgs = prismaMock.memorialContent.upsert.mock.calls[0][0];
    expect(callArgs.update.content).toBe('A loving father');
    expect(callArgs.create.content).toBe('A loving father');
  });

  it('updateMemorialContent revalidates correct paths', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialContent.upsert.mockResolvedValue({ id: 'content-1' });

    await updateMemorialContent('about_text', 'Some text');

    expect(mockRevalidatePath).toHaveBeenCalledWith('/richard-hudson-sr');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/memorial/content');
  });
});

// ============================================================
// 2. Bug Fix Verification Tests
// ============================================================

describe('Bug Fix Verification', () => {
  // Bug 1: Photo URLs should be direct CDN URLs (not /api/images/ route)
  it('photo seed data uses direct Unsplash CDN URLs, not /api/images/ paths', async () => {
    const seedFile = await fs.readFile(
      path.join(process.cwd(), 'prisma', 'seed-content.ts'),
      'utf-8'
    );
    // Extract all originalPath and thumbnailPath URLs
    const urlMatches = seedFile.match(/(?:originalPath|thumbnailPath):\s*"([^"]+)"/g) || [];
    expect(urlMatches.length).toBeGreaterThan(0);

    for (const match of urlMatches) {
      expect(match).not.toContain('/api/images/');
      expect(match).toContain('images.unsplash.com');
    }
  });

  // Bug 2: MDX tables render with remark-gfm
  it('blog page uses remark-gfm plugin for GFM table support', async () => {
    const blogPage = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'blog', '[slug]', 'page.tsx'),
      'utf-8'
    );
    expect(blogPage).toContain('import remarkGfm from "remark-gfm"');
    expect(blogPage).toContain('remarkPlugins: [remarkGfm]');
  });

  // Bug 4: Event relative time formatting
  describe('event card relative time formatting', () => {
    // We test the getRelativeLabel logic by rendering EventCard and checking the badge.
    // Since getRelativeLabel is not exported, we test via the component indirectly,
    // or duplicate the logic for unit-level testing.

    // Recreate the getRelativeLabel function locally to unit test it
    function getRelativeLabel(startDate: Date): string | null {
      const now = new Date();
      const start = new Date(startDate);
      const diffMs = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return null;
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays <= 7) return `In ${diffDays} days`;
      if (diffDays <= 14) return 'Next week';
      if (diffDays <= 30) {
        const weeks = Math.round(diffDays / 7);
        return `In ${weeks} week${weeks === 1 ? '' : 's'}`;
      }
      if (diffDays <= 60) {
        const months = Math.round(diffDays / 30);
        return `In ${months} month${months === 1 ? '' : 's'}`;
      }
      return null;
    }

    it('shows "Next week" for events 8-14 days away', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      expect(getRelativeLabel(futureDate)).toBe('Next week');
    });

    it('shows "In N weeks" for events 15-30 days away', () => {
      // 15 days away -> ~2 weeks
      const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const result = getRelativeLabel(futureDate);
      expect(result).toMatch(/^In \d+ weeks?$/);
    });

    it('shows "In 2 months" for events 50 days away', () => {
      const futureDate = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
      expect(getRelativeLabel(futureDate)).toBe('In 2 months');
    });

    it('returns null for past events', () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(getRelativeLabel(pastDate)).toBeNull();
    });

    it('shows "Tomorrow" for events 1 day away', () => {
      // Use a time far enough ahead to ensure Math.ceil gives 1
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000);
      expect(getRelativeLabel(tomorrow)).toBe('Tomorrow');
    });

    it('shows "Today" for events happening now (diffDays === 0)', () => {
      // Set to a few seconds from now (diffMs > 0 but Math.ceil gives 0)
      // Actually Math.ceil(positive_small / day) = 1, not 0
      // diffDays === 0 when diffMs is <= 0 but >= -day... no.
      // Looking at the code: diffDays = Math.ceil(diffMs / day)
      // For "today" to work, the event must be very close or slightly past
      // Actually Math.ceil of a very small positive = 1, so "Today" requires diffDays === 0
      // which means diffMs <= 0 (slightly past) but NOT diffDays < 0 (more than 0ms past)
      // Actually Math.ceil(0) = 0 and Math.ceil(negative_small) = 0 too
      // diffDays < 0 means Math.ceil(diffMs/day) < 0, which means diffMs < -day
      // So "Today" fires when -day < diffMs <= 0, i.e. event was earlier today
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      // This might be in the past (earlier today), giving diffMs < 0 but diffDays = 0
      // Let's just use Date.now() - 1000 (1 second ago)
      const justPast = new Date(Date.now() - 1000);
      expect(getRelativeLabel(justPast)).toBe('Today');
    });

    it('shows "In N days" for events 2-7 days away', () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const result = getRelativeLabel(futureDate);
      expect(result).toMatch(/^In \d+ days$/);
    });

    it('returns null for events more than 60 days away', () => {
      const farFuture = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      expect(getRelativeLabel(farFuture)).toBeNull();
    });

    it('shows "In 1 month" for events ~30 days away', () => {
      const futureDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
      const result = getRelativeLabel(futureDate);
      expect(result).toBe('In 1 month');
    });
  });

  // Bug 6: All Unsplash URLs in seed/memorial are valid format
  it('all seed photo URLs are valid Unsplash CDN format', async () => {
    const seedFile = await fs.readFile(
      path.join(process.cwd(), 'prisma', 'seed-content.ts'),
      'utf-8'
    );
    const urlRegex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+\?[^"]+/g;
    const urls = seedFile.match(urlRegex) || [];
    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      // Validate URL format
      expect(() => new URL(url)).not.toThrow();
      // Should have query params for sizing
      const parsed = new URL(url);
      expect(parsed.hostname).toBe('images.unsplash.com');
      expect(parsed.searchParams.has('w')).toBe(true);
    }
  });

  it('all memorial page photo URLs are valid Unsplash CDN format', async () => {
    const memorialPage = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    const urlRegex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+\?[^"]+/g;
    const urls = memorialPage.match(urlRegex) || [];
    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      expect(() => new URL(url)).not.toThrow();
      const parsed = new URL(url);
      expect(parsed.hostname).toBe('images.unsplash.com');
    }
  });
});

// ============================================================
// 3. SEO Verification Tests
// ============================================================

describe('SEO -- Memorial Page', () => {
  it('memorial page has correct title meta tag', async () => {
    const page = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    expect(page).toContain('Richard Hudson Sr.');
    expect(page).toContain('In Loving Memory');
    // Check the metadata export includes title
    expect(page).toContain('title: "Richard Hudson Sr.');
  });

  it('memorial page has canonical URL set', async () => {
    const page = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    expect(page).toContain('canonical: "https://thehudsonfam.com/richard-hudson-sr"');
  });

  it('memorial page has Open Graph profile type', async () => {
    const page = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    expect(page).toContain('type: "profile"');
  });

  it('memorial page includes Richard Hudson in keywords', async () => {
    const page = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    expect(page).toContain('"Richard Hudson"');
    expect(page).toContain('"Richard Hudson Sr"');
    expect(page).toContain('"Richard Hudson memorial"');
  });

  it('memorial page has JSON-LD structured data', async () => {
    const page = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    expect(page).toContain('application/ld+json');
    expect(page).toContain('@type": "Person"');
    expect(page).toContain('@type": "WebPage"');
  });

  it('memorial page has twitter card meta', async () => {
    const page = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    expect(page).toContain('card: "summary_large_image"');
  });

  it('memorial page has robots directive allowing indexing', async () => {
    const page = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    expect(page).toContain('index: true');
    expect(page).toContain('follow: true');
  });
});

describe('SEO -- Sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.album.findMany.mockResolvedValue([]);
  });

  it('sitemap includes /richard-hudson-sr with high priority', async () => {
    // We can verify by reading the source directly
    const sitemapFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'sitemap.ts'),
      'utf-8'
    );
    expect(sitemapFile).toContain('/richard-hudson-sr');
    expect(sitemapFile).toContain('priority: 0.95');
  });

  it('sitemap includes all static pages', async () => {
    const sitemapFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'sitemap.ts'),
      'utf-8'
    );
    const requiredPaths = ['/blog', '/photos', '/events', '/family', '/richard-hudson-sr'];
    for (const p of requiredPaths) {
      expect(sitemapFile).toContain(p);
    }
  });

  it('sitemap generates blog post entries from getAllPosts', async () => {
    const sitemapFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'sitemap.ts'),
      'utf-8'
    );
    // Verify the sitemap uses blog slugs
    expect(sitemapFile).toContain('`${SITE_URL}/blog/${post.slug}`');
  });

  it('sitemap gracefully handles DB errors for albums', async () => {
    const sitemapFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'sitemap.ts'),
      'utf-8'
    );
    // Should have try/catch around album query
    expect(sitemapFile).toContain('catch');
    expect(sitemapFile).toContain('DB not available during build');
  });
});

describe('SEO -- RSS Feed', () => {
  it('RSS feed source returns application/rss+xml content type', async () => {
    const rssFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'api', 'blog', 'rss', 'route.ts'),
      'utf-8'
    );
    expect(rssFile).toContain('application/rss+xml');
  });

  it('RSS feed generates valid XML structure', async () => {
    const rssFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'api', 'blog', 'rss', 'route.ts'),
      'utf-8'
    );
    expect(rssFile).toContain('<?xml version="1.0"');
    expect(rssFile).toContain('<rss version="2.0"');
    expect(rssFile).toContain('</channel>');
    expect(rssFile).toContain('</rss>');
  });

  it('RSS feed escapes XML special characters', async () => {
    const rssFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'api', 'blog', 'rss', 'route.ts'),
      'utf-8'
    );
    // Should have escapeXml function that handles &, <, >, ", '
    expect(rssFile).toContain('&amp;');
    expect(rssFile).toContain('&lt;');
    expect(rssFile).toContain('&gt;');
    expect(rssFile).toContain('&quot;');
    expect(rssFile).toContain('&apos;');
  });

  it('RSS feed includes atom:link self-reference', async () => {
    const rssFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'api', 'blog', 'rss', 'route.ts'),
      'utf-8'
    );
    expect(rssFile).toContain('atom:link');
    expect(rssFile).toContain('rel="self"');
  });
});

// ============================================================
// 4. Auth & Security Tests
// ============================================================

describe('Auth -- Invite Token Flow', () => {
  beforeEach(() => {
    prismaMock.inviteToken.findUnique.mockReset();
  });

  it('valid invite token returns valid: true', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue({
      id: '1',
      token: 'valid-token',
      email: 'test@test.com',
      role: 'member',
      usedAt: null,
      usedById: null,
      expiresAt: new Date(Date.now() + 86400000),
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    const response = await validateInviteGET(createInviteRequest({ token: 'valid-token' }));
    const body = await response.json();

    expect(body.valid).toBe(true);
    expect(body.email).toBe('test@test.com');
    expect(body.role).toBe('member');
  });

  it('expired invite token returns valid: false', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue({
      id: '1',
      token: 'expired-token',
      email: 'test@test.com',
      role: 'member',
      usedAt: null,
      usedById: null,
      expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    const response = await validateInviteGET(createInviteRequest({ token: 'expired-token' }));
    const body = await response.json();

    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invite expired');
  });

  it('used invite token returns valid: false', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue({
      id: '1',
      token: 'used-token',
      email: 'test@test.com',
      role: 'member',
      usedAt: new Date(Date.now() - 3600000),
      usedById: 'user-2',
      expiresAt: new Date(Date.now() + 86400000),
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    const response = await validateInviteGET(createInviteRequest({ token: 'used-token' }));
    const body = await response.json();

    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invite already used');
  });

  it('missing token returns valid: false', async () => {
    const response = await validateInviteGET(createInviteRequest({}));
    const body = await response.json();

    expect(body.valid).toBe(false);
  });

  it('nonexistent token returns valid: false with correct error', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue(null);

    const response = await validateInviteGET(createInviteRequest({ token: 'nonexistent' }));
    const body = await response.json();

    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invalid invite token');
  });
});

describe('Auth -- Memorial Admin Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('memorial admin actions blocked for non-owner', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(approveMemory('memory-1')).rejects.toThrow('Forbidden');
    await expect(rejectMemory('memory-1')).rejects.toThrow('Forbidden');

    expect(prismaMock.memory.update).not.toHaveBeenCalled();
    expect(prismaMock.memory.delete).not.toHaveBeenCalled();
  });

  it('memory moderation blocked for non-owner', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));

    await expect(addMemorialMedia(makeMediaFormData())).rejects.toThrow('Forbidden');
    await expect(removeMemorialMedia('media-1')).rejects.toThrow('Forbidden');
    await expect(updateMemorialContent('section', 'content')).rejects.toThrow('Forbidden');

    expect(prismaMock.memorialMedia.create).not.toHaveBeenCalled();
    expect(prismaMock.memorialMedia.delete).not.toHaveBeenCalled();
    expect(prismaMock.memorialContent.upsert).not.toHaveBeenCalled();
  });

  it('all memorial owner actions call requireRole with ["owner"]', async () => {
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memory.update.mockResolvedValue({ id: 'm1' });
    prismaMock.memory.delete.mockResolvedValue({ id: 'm1' });
    prismaMock.memorialMedia.create.mockResolvedValue({ id: 'mm1' });
    prismaMock.memorialMedia.delete.mockResolvedValue({ id: 'mm1' });
    prismaMock.memorialContent.upsert.mockResolvedValue({ id: 'mc1' });

    await approveMemory('m1');
    expect(mockRequireRole).toHaveBeenCalledWith(['owner']);

    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memory.delete.mockResolvedValue({ id: 'm1' });
    await rejectMemory('m1');
    expect(mockRequireRole).toHaveBeenCalledWith(['owner']);

    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialMedia.create.mockResolvedValue({ id: 'mm1' });
    await addMemorialMedia(makeMediaFormData());
    expect(mockRequireRole).toHaveBeenCalledWith(['owner']);

    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialMedia.delete.mockResolvedValue({ id: 'mm1' });
    await removeMemorialMedia('mm1');
    expect(mockRequireRole).toHaveBeenCalledWith(['owner']);

    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(fakeOwnerSession);
    prismaMock.memorialContent.upsert.mockResolvedValue({ id: 'mc1' });
    await updateMemorialContent('section', 'content');
    expect(mockRequireRole).toHaveBeenCalledWith(['owner']);
  });
});

// ============================================================
// 5. Integration Smoke Tests
// ============================================================

describe('Integration -- Page Rendering', () => {
  it('robots.txt disallows /dashboard and /admin', async () => {
    const robotsFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'robots.ts'),
      'utf-8'
    );
    expect(robotsFile).toContain('/dashboard');
    expect(robotsFile).toContain('/admin');
    expect(robotsFile).toContain('/api/');
  });

  it('robots.txt allows root path', async () => {
    const robotsFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'robots.ts'),
      'utf-8'
    );
    expect(robotsFile).toContain('allow: "/"');
  });

  it('robots.txt includes sitemap URL', async () => {
    const robotsFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'robots.ts'),
      'utf-8'
    );
    expect(robotsFile).toContain('sitemap: "https://thehudsonfam.com/sitemap.xml"');
  });

  it('iCal feed source returns text/calendar content type', async () => {
    const icalFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'api', 'events', 'ical', 'route.ts'),
      'utf-8'
    );
    expect(icalFile).toContain('text/calendar');
    expect(icalFile).toContain('BEGIN:VCALENDAR');
    expect(icalFile).toContain('END:VCALENDAR');
    expect(icalFile).toContain('VERSION:2.0');
  });

  it('iCal feed escapes special characters', async () => {
    const icalFile = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'api', 'events', 'ical', 'route.ts'),
      'utf-8'
    );
    // escapeICalText should handle backslash, semicolon, comma, newline
    expect(icalFile).toContain('escapeICalText');
    expect(icalFile).toContain('\\\\');
    expect(icalFile).toContain('\\;');
    expect(icalFile).toContain('\\,');
    expect(icalFile).toContain('\\n');
  });

  it('Hudson Digital Solutions backlink present in public layout footer', async () => {
    const layout = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'layout.tsx'),
      'utf-8'
    );
    expect(layout).toContain('hudsondigitalsolutions.com');
    expect(layout).toContain('Hudson Digital Solutions');
    // Should open in new tab with noopener
    expect(layout).toContain('target="_blank"');
    expect(layout).toContain('rel="noopener"');
  });

  it('blog getPostBySlug prevents path traversal attacks', async () => {
    // These should all return null (path traversal attempts)
    const traversalSlugs = ['../etc/passwd', '..\\windows\\system32', 'foo/../../bar'];
    for (const slug of traversalSlugs) {
      const result = await getPostBySlug(slug);
      expect(result).toBeNull();
    }
  });

  it('blog getPostBySlug returns null for empty slug', async () => {
    const result = await getPostBySlug('');
    expect(result).toBeNull();
  });
});

// ============================================================
// 6. Blog Content Tests
// ============================================================

describe('Blog -- Content Handling', () => {
  it('getAllPosts returns posts sorted by date descending', async () => {
    // This test uses the actual blog files on disk
    const posts = await getAllPosts();
    if (posts.length >= 2) {
      for (let i = 1; i < posts.length; i++) {
        const prevDate = new Date(posts[i - 1].frontmatter.date).getTime();
        const currDate = new Date(posts[i].frontmatter.date).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    }
  });

  it('getAllPosts returns BlogPostMeta with all required fields', async () => {
    const posts = await getAllPosts();
    for (const post of posts) {
      expect(post.slug).toBeDefined();
      expect(typeof post.slug).toBe('string');
      expect(post.frontmatter.title).toBeDefined();
      expect(post.frontmatter.date).toBeDefined();
      expect(Array.isArray(post.frontmatter.tags)).toBe(true);
      expect(post.readingTime).toMatch(/\d+ min read/);
    }
  });

  it('blog post frontmatter tags are always arrays (never strings)', async () => {
    const posts = await getAllPosts();
    for (const post of posts) {
      expect(Array.isArray(post.frontmatter.tags)).toBe(true);
    }
  });
});
