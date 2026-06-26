/**
 * prod-readiness.test.ts
 *
 * Production-readiness tests covering:
 * - Memorial system (submission, moderation, media, content management)
 * - Bug fix verification (photo URLs)
 * - SEO verification (metadata, sitemap, RSS feed)
 * - Auth & security (invite tokens, memorial admin access)
 * - Integration smoke tests (robots.txt, layout backlink)
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
  // Cache Components directives — no-ops (require Next's cacheComponents runtime).
  cacheLife: () => {},
  cacheTag: () => {},
  unstable_cacheLife: () => {},
  unstable_cacheTag: () => {},
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

import { GET as validateInviteGET } from '@/app/api/invite/validate/route';
import { NextRequest } from 'next/server';

// ============================================================
// Helpers
// ============================================================

function createInviteRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/invite/validate');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// ============================================================
// 2. Bug Fix Verification Tests
// ============================================================

describe('Bug Fix Verification', () => {
  // EXIF orientation: every sharp resize pipeline must auto-orient (.rotate())
  // first, or phone photos (orientation in EXIF, not pixels) store sideways
  // because WebP output drops the EXIF tag.
  it('image processing auto-orients via .rotate() before every resize', async () => {
    const images = await fs.readFile(
      path.join(process.cwd(), 'src', 'lib', 'images.ts'),
      'utf-8'
    );
    const resizeCount = (images.match(/\.resize\(/g) || []).length;
    const rotateCount = (images.match(/\.rotate\(\)/g) || []).length;
    expect(resizeCount).toBeGreaterThan(0);
    expect(rotateCount).toBeGreaterThanOrEqual(resizeCount);
  });

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

  it('image route gates visibility on published, not album membership', async () => {
    const route = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', 'api', 'images', '[...path]', 'route.ts'), 'utf-8');
    expect(route).toMatch(/requiresAuth\s*=\s*!photo\.published/);
    expect(route).not.toMatch(/requiresAuth\s*=\s*!photo\.albumId/);
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

  it('memorial uses the DB hero photo and has no stock images, gallery, video, or memory form', async () => {
    const memorialPage = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'richard-hudson-sr', 'page.tsx'),
      'utf-8'
    );
    // The hero portrait is the first photo of the memorial Collection
    // (slug: "memorial"); the page never shows stock photography.
    expect(memorialPage).not.toContain('images.unsplash.com');
    expect(memorialPage).toContain('getMemorialPhotos');
    expect(memorialPage).toContain('collectionPhoto');
    expect(memorialPage).toContain('slug: "memorial"');
    expect(memorialPage).toContain('heroPhoto');
    // Redesign removed the gallery, video section, and "share a memory".
    expect(memorialPage).not.toContain('LayoutGrid');
    expect(memorialPage).not.toContain('MemoryForm');
    expect(memorialPage).not.toMatch(/type:\s*"video"/);
    // The Revelation 21:4 scripture remains.
    expect(memorialPage).toContain('Revelation 21:4');
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
    expect(page).toContain('twitter:');
    // Card is a large-image card when a real photo exists, summary otherwise.
    expect(page).toContain('summary_large_image');
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
    prismaMock.collection.findMany.mockResolvedValue([]);
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

  it('Hudson Digital Solutions backlink present in public layout footer', async () => {
    const layout = await fs.readFile(
      path.join(process.cwd(), 'src', 'app', '(public)', 'layout.tsx'),
      'utf-8'
    );
    expect(layout).toContain('hudsondigitalsolutions.com');
    expect(layout).toContain('Hudson Digital Solutions');
    // Should open in new tab with noopener noreferrer
    expect(layout).toContain('target="_blank"');
    expect(layout).toContain('rel="noopener noreferrer"');
  });

});

// ============================================================
// 6. v5.0 Prune Guard — Dead-Code Permanence
// ============================================================
//
// Permanently enforces that identifiers pruned during v5.0 (Phase 32+)
// never return to production source. The scan uses pure Node fs — no
// child_process/grep — to avoid Pitfall 2 (grep exit-code-2 masquerading
// as a pass). The src/__tests__/ directory is excluded because:
//   - nav-footer.test.ts contains legitimate negative assertions (e.g.
//     `expect(footerSection).not.toContain('href="/blog"')`)
//   - this guard block itself lists the dead identifier strings
// Scanning __tests__ would cause the guard to self-invalidate.

describe('v5.0 Prune Guard', () => {
  // Path-like identifiers (/blog, /family, lib/blog) are boundary-matched so a
  // legit string like '/family-tree', '/blog-archive', or 'https://x/blog' does
  // NOT false-positive. The bare type identifiers (BlogPost, FamilyUpdate,
  // PostStatus) are specific enough to stay plain substring matches.
  // Boundary: the char after the route must be end-of-string, a quote, a slash,
  // a backtick, or a non-[\w-] char — so '/blog"', "/blog'", '/blog`', '/blog/'
  // and a trailing '/blog' all fire, but '/blog-archive' / '/family-tree' do not.
  const DEAD_IDENTIFIERS: Array<{ label: string; test: (c: string) => boolean }> = [
    { label: 'BlogPost', test: (c) => c.includes('BlogPost') },
    { label: 'FamilyUpdate', test: (c) => c.includes('FamilyUpdate') },
    { label: 'PostStatus', test: (c) => c.includes('PostStatus') },
    { label: 'lib/blog', test: (c) => c.includes('lib/blog') },
    { label: '/blog', test: (c) => /\/blog(?![\w-])/.test(c) },
    { label: '/family', test: (c) => /\/family(?![\w-])/.test(c) },
  ];

  it('no production source file contains any removed v5.0 identifier', async () => {
    const srcDir = path.join(process.cwd(), 'src');

    // Recursively collect all scannable source files, excluding __tests__ directories
    async function collectSourceFiles(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        // Skip __tests__ directories to avoid false positives from legitimate
        // negative-assertion tests and from this guard's own identifier array
        if (entry.isDirectory() && entry.name === '__tests__') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...(await collectSourceFiles(fullPath)));
        } else if (
          entry.isFile() &&
          /\.(ts|tsx|js|jsx|mjs|cjs|css|json|mdx)$/.test(entry.name)
        ) {
          // Scan TS/TSX plus the other content/asset types this app ships
          // (.js/.jsx/.mjs/.cjs scripts, .css globals, .json config, .mdx
          // blog content) so a re-introduced dead route reference in a
          // non-TS source file is still caught. __tests__/ stays excluded.
          files.push(fullPath);
        }
      }
      return files;
    }

    const sourceFiles = await collectSourceFiles(srcDir);
    expect(sourceFiles.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; matches: string[] }> = [];

    for (const filePath of sourceFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const matched = DEAD_IDENTIFIERS.filter((d) => d.test(content)).map((d) => d.label);
      if (matched.length > 0) {
        violations.push({ file: filePath.replace(process.cwd() + '/', ''), matches: matched });
      }
    }

    const report = violations
      .map((v) => `  ${v.file}: [${v.matches.join(', ')}]`)
      .join('\n');

    expect(
      violations,
      `v5.0 dead identifiers found in production source — re-introduction detected:\n${report}\n` +
        `Identifiers checked: ${DEAD_IDENTIFIERS.map((d) => d.label).join(', ')}`
    ).toHaveLength(0);
  });
});

