import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs/promises before importing the module
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    readdir: (...args: unknown[]) => mockReaddir(...args),
    readFile: (...args: unknown[]) => mockReadFile(...args),
  },
}));

import { getAllPosts, getPostBySlug, getAllTags, getPostsByTag } from '@/lib/blog';

const POST_1 = `---
title: "First Post"
date: "2026-03-20"
excerpt: "The first blog post"
tags: ["family", "announcements"]
coverImage: null
author: "Richard Hudson"
---

This is the first post content with enough words to test reading time calculation.
`;

const POST_2 = `---
title: "Second Post"
date: "2026-03-25"
excerpt: "The second blog post"
tags: ["travel", "family"]
coverImage: "/images/trip.jpg"
author: "Sarah Hudson"
---

This is the second post.
`;

const POST_MINIMAL = `---
title: "Minimal"
---

Short content.
`;

describe('blog utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPosts', () => {
    it('returns posts sorted by date descending', async () => {
      mockReaddir.mockResolvedValue(['first-post.mdx', 'second-post.mdx']);
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('first-post')) return Promise.resolve(POST_1);
        if (filePath.includes('second-post')) return Promise.resolve(POST_2);
        return Promise.reject(new Error('Not found'));
      });

      const posts = await getAllPosts();

      expect(posts).toHaveLength(2);
      // Second post (2026-03-25) should be first (newest first)
      expect(posts[0].slug).toBe('second-post');
      expect(posts[1].slug).toBe('first-post');
    });

    it('filters to only .mdx files', async () => {
      mockReaddir.mockResolvedValue(['post.mdx', 'readme.md', 'notes.txt']);
      mockReadFile.mockResolvedValue(POST_1);

      const posts = await getAllPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0].slug).toBe('post');
    });

    it('returns empty array when blog directory does not exist', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      const posts = await getAllPosts();

      expect(posts).toEqual([]);
    });

    it('strips .mdx extension for slug', async () => {
      mockReaddir.mockResolvedValue(['my-great-post.mdx']);
      mockReadFile.mockResolvedValue(POST_1);

      const posts = await getAllPosts();

      expect(posts[0].slug).toBe('my-great-post');
    });

    it('provides defaults for missing frontmatter fields', async () => {
      mockReaddir.mockResolvedValue(['minimal.mdx']);
      mockReadFile.mockResolvedValue(POST_MINIMAL);

      const posts = await getAllPosts();

      expect(posts[0].frontmatter.title).toBe('Minimal');
      expect(posts[0].frontmatter.excerpt).toBe('');
      expect(posts[0].frontmatter.tags).toEqual([]);
      expect(posts[0].frontmatter.coverImage).toBeNull();
      expect(posts[0].frontmatter.author).toBe('Hudson Family');
    });

    it('calculates reading time', async () => {
      mockReaddir.mockResolvedValue(['first-post.mdx']);
      mockReadFile.mockResolvedValue(POST_1);

      const posts = await getAllPosts();

      expect(posts[0].readingTime).toMatch(/\d+ min read/);
    });
  });

  describe('getPostBySlug', () => {
    it('returns a post with content for valid slug', async () => {
      mockReadFile.mockResolvedValue(POST_1);

      const post = await getPostBySlug('first-post');

      expect(post).not.toBeNull();
      expect(post!.slug).toBe('first-post');
      expect(post!.frontmatter.title).toBe('First Post');
      expect(post!.content).toContain('first post content');
      expect(post!.readingTime).toMatch(/\d+ min read/);
    });

    it('returns null for nonexistent slug', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const post = await getPostBySlug('nonexistent');

      expect(post).toBeNull();
    });

    it('parses frontmatter correctly', async () => {
      mockReadFile.mockResolvedValue(POST_2);

      const post = await getPostBySlug('second-post');

      expect(post!.frontmatter.title).toBe('Second Post');
      expect(post!.frontmatter.date).toBe('2026-03-25');
      expect(post!.frontmatter.tags).toEqual(['travel', 'family']);
      expect(post!.frontmatter.coverImage).toBe('/images/trip.jpg');
      expect(post!.frontmatter.author).toBe('Sarah Hudson');
    });
  });

  describe('getAllTags', () => {
    it('returns unique sorted tags across all posts', async () => {
      mockReaddir.mockResolvedValue(['first-post.mdx', 'second-post.mdx']);
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('first-post')) return Promise.resolve(POST_1);
        if (filePath.includes('second-post')) return Promise.resolve(POST_2);
        return Promise.reject(new Error('Not found'));
      });

      const tags = await getAllTags();

      expect(tags).toEqual(['announcements', 'family', 'travel']);
    });

    it('returns empty array when no posts exist', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      const tags = await getAllTags();

      expect(tags).toEqual([]);
    });
  });

  describe('getPostsByTag', () => {
    it('returns posts matching a tag (case-insensitive)', async () => {
      mockReaddir.mockResolvedValue(['first-post.mdx', 'second-post.mdx']);
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('first-post')) return Promise.resolve(POST_1);
        if (filePath.includes('second-post')) return Promise.resolve(POST_2);
        return Promise.reject(new Error('Not found'));
      });

      const posts = await getPostsByTag('Travel');

      expect(posts).toHaveLength(1);
      expect(posts[0].slug).toBe('second-post');
    });

    it('returns posts with shared tag', async () => {
      mockReaddir.mockResolvedValue(['first-post.mdx', 'second-post.mdx']);
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('first-post')) return Promise.resolve(POST_1);
        if (filePath.includes('second-post')) return Promise.resolve(POST_2);
        return Promise.reject(new Error('Not found'));
      });

      const posts = await getPostsByTag('family');

      expect(posts).toHaveLength(2);
    });
  });
});
