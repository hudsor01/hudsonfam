/**
 * nav-footer.test.tsx — Wave 0 (RED)
 *
 * Encodes the Phase 35 VALIDATION.md contract for navbar and footer IA.
 * These tests describe the TARGET state after Plan 35-02 ships. They are
 * EXPECTED TO FAIL on the current codebase (RED phase). Do not weaken
 * assertions to make them pass prematurely.
 *
 * Requirements covered: NAV-01, NAV-02, NAV-03, FOOT-01, FOOT-02
 *
 * RED failures expected:
 *   - NAV-01 label: layout still has "Grandma Hudson's Recipes"
 *   - NAV-01 order: layout has Photos before Recipes
 *   - FOOT-01: footer missing /recipes and /richard-hudson-sr
 *   - NAV-03 desktop: NavLink stub has no aria-current
 *   - NAV-03 mobile: MobileNav has no aria-current
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { NavLink } from '@/components/public/nav-link';
import { MobileNav } from '@/components/public/mobile-nav';
import { isNavActive } from '@/lib/nav';

// ---------------------------------------------------------------------------
// Mock next/navigation BEFORE component imports that call usePathname.
// usePathname is a vi.fn() so individual tests can re-mock the return value
// (default: '/recipes' → the Recipes link is active).
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/recipes'),
}));

const mockUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockUsePathname.mockReturnValue('/recipes');
});

// ---------------------------------------------------------------------------
// Helper: read layout.tsx source (mirrors prod-readiness.test.ts:930 pattern)
// ---------------------------------------------------------------------------

async function readLayout(): Promise<string> {
  return fs.readFile(
    path.join(process.cwd(), 'src', 'app', '(public)', 'layout.tsx'),
    'utf-8'
  );
}

// ---------------------------------------------------------------------------
// NAV-01: navLinks array — label, order, count
// ---------------------------------------------------------------------------

describe('NAV-01: navLinks array in layout.tsx', () => {
  it('contains the short label "Recipes" (not "Grandma Hudson\'s Recipes")', async () => {
    const layout = await readLayout();
    // FAILS RED: current source has "Grandma Hudson's Recipes"
    expect(layout).toContain('"Recipes"');
    expect(layout).not.toContain("Grandma Hudson's Recipes");
  });

  it('has Recipes ordered before Photos in the navLinks region', async () => {
    const layout = await readLayout();
    const recipesIndex = layout.indexOf('"/recipes"');
    const photosIndex = layout.indexOf('"/photos"');
    // FAILS RED: current order is Photos then Recipes
    expect(recipesIndex).toBeGreaterThan(-1);
    expect(photosIndex).toBeGreaterThan(-1);
    expect(recipesIndex).toBeLessThan(photosIndex);
  });

  it('navLinks source contains exactly the 5 required hrefs', async () => {
    const layout = await readLayout();
    const requiredHrefs = ['/', '/recipes', '/photos', '/events', '/richard-hudson-sr'];
    for (const href of requiredHrefs) {
      // All 5 hrefs already exist — this should pass on current source
      expect(layout).toContain(`"${href}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// FOOT-01: footer link set — present + absent
// FOOT-02: footer responsive class
// ---------------------------------------------------------------------------

describe('FOOT-01 + FOOT-02: footer links in layout.tsx', () => {
  it('footer contains href="/recipes"', async () => {
    const layout = await readLayout();
    const footerStart = layout.indexOf('<footer');
    const footerSection = layout.slice(footerStart);
    // FAILS RED: footer currently has Photos and Events only
    expect(footerSection).toContain('href="/recipes"');
  });

  it('footer contains href="/photos"', async () => {
    const layout = await readLayout();
    const footerStart = layout.indexOf('<footer');
    const footerSection = layout.slice(footerStart);
    // Passes: Photos is already in the footer
    expect(footerSection).toContain('href="/photos"');
  });

  it('footer contains href="/events"', async () => {
    const layout = await readLayout();
    const footerStart = layout.indexOf('<footer');
    const footerSection = layout.slice(footerStart);
    // Passes: Events is already in the footer
    expect(footerSection).toContain('href="/events"');
  });

  it('footer contains href="/richard-hudson-sr" (In Memory)', async () => {
    const layout = await readLayout();
    const footerStart = layout.indexOf('<footer');
    const footerSection = layout.slice(footerStart);
    // FAILS RED: /richard-hudson-sr is not in the footer yet
    expect(footerSection).toContain('href="/richard-hudson-sr"');
  });

  it('footer does NOT contain a /blog link', async () => {
    const layout = await readLayout();
    const footerStart = layout.indexOf('<footer');
    const footerSection = layout.slice(footerStart);
    // Passes: /blog already pruned in Phase 32
    expect(footerSection).not.toContain('href="/blog"');
  });

  it('footer does NOT contain a /family link', async () => {
    const layout = await readLayout();
    const footerStart = layout.indexOf('<footer');
    const footerSection = layout.slice(footerStart);
    // Passes: /family already pruned in Phase 32
    expect(footerSection).not.toContain('href="/family"');
  });

  it('footer has flex-col sm:flex-row for responsive stacking (FOOT-02)', async () => {
    const layout = await readLayout();
    const footerStart = layout.indexOf('<footer');
    const footerSection = layout.slice(footerStart);
    // Passes: flex-col sm:flex-row already present in footer div
    expect(footerSection).toContain('flex-col sm:flex-row');
  });
});

// ---------------------------------------------------------------------------
// NAV-03 desktop: NavLink emits aria-current="page" for active route.
//
// NavLink stub (src/components/public/nav-link.tsx) renders a plain <Link>
// with no aria-current. These assertions FAIL RED until Plan 02 replaces
// the stub with the real usePathname-aware implementation.
// ---------------------------------------------------------------------------

describe('NAV-03 desktop: NavLink aria-current', () => {
  it('renders aria-current="page" when usePathname() matches href', () => {
    // usePathname mocked to '/recipes' → NavLink with href="/recipes" is active
    const { container } = render(
      <NavLink href="/recipes">Recipes</NavLink>
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    // FAILS RED: stub has no aria-current; Plan 02 adds usePathname + aria-current
    expect(link!.getAttribute('aria-current')).toBe('page');
  });

  it('does NOT render aria-current when usePathname() does not match href', () => {
    // /photos is inactive (pathname = '/recipes')
    const { container } = render(
      <NavLink href="/photos">Photos</NavLink>
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    // Passes on stub (no aria-current) and on real implementation (inactive path)
    expect(link!.getAttribute('aria-current')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// NAV-02: MobileNav renders all 5 nav links
// NAV-03 mobile: active mobile link has aria-current="page"
//
// MobileNav exists. The Sheet (Radix Dialog) renders content in a portal
// only when open — we click the trigger to open it before querying links.
// NAV-02 link-count assertions pass. NAV-03 aria-current FAILS RED.
// ---------------------------------------------------------------------------

describe('NAV-02 + NAV-03 mobile: MobileNav render', () => {
  const testLinks = [
    { href: '/', label: 'Home' },
    { href: '/recipes', label: 'Recipes' },
    { href: '/photos', label: 'Photos' },
    { href: '/events', label: 'Events' },
    { href: '/richard-hudson-sr', label: 'In Memory' },
  ];

  /** Opens the Sheet drawer by clicking the trigger button. */
  function openDrawer() {
    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);
  }

  it('renders all 5 link labels after drawer opens (NAV-02)', () => {
    render(<MobileNav links={testLinks} />);
    openDrawer();
    const expectedLabels = ['Home', 'Recipes', 'Photos', 'Events', 'In Memory'];
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('active mobile link has aria-current="page" when pathname matches (NAV-03)', () => {
    // usePathname = '/recipes' → Recipes link is active
    render(<MobileNav links={testLinks} />);
    openDrawer();
    const recipesLink = screen.getByText('Recipes').closest('a');
    expect(recipesLink).not.toBeNull();
    // FAILS RED: MobileNav has no aria-current yet; Plan 02 adds it
    expect(recipesLink!.getAttribute('aria-current')).toBe('page');
  });

  it('inactive mobile link does NOT have aria-current (NAV-03 regression guard)', () => {
    render(<MobileNav links={testLinks} />);
    openDrawer();
    const photosLink = screen.getByText('Photos').closest('a');
    expect(photosLink).not.toBeNull();
    // Passes on current (no aria-current on any link) and on Plan 02 (Photos inactive)
    expect(photosLink!.getAttribute('aria-current')).toBeNull();
  });

  it('Sign In link is reachable in the mobile drawer (NAV-02)', () => {
    render(<MobileNav links={testLinks} />);
    openDrawer();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// IN-01: active-route predicate edge cases (regression guard for WR-01).
//
// The shared isNavActive helper is the only real logic in this phase. These
// unit tests pin the risky branches: the root-path guard and the prefix-
// sibling collision that WR-01 fixed. They would have caught WR-01.
// ---------------------------------------------------------------------------

describe('IN-01: isNavActive predicate edge cases', () => {
  it('root "/" does NOT activate on a non-root path like "/recipes"', () => {
    expect(isNavActive('/recipes', '/')).toBe(false);
  });

  it('root "/" activates only on exactly "/"', () => {
    expect(isNavActive('/', '/')).toBe(true);
  });

  it('"/recipes" activates on "/recipes" (exact match)', () => {
    expect(isNavActive('/recipes', '/recipes')).toBe(true);
  });

  it('"/recipes" activates on a child route "/recipes/chocolate"', () => {
    expect(isNavActive('/recipes/chocolate', '/recipes')).toBe(true);
  });

  it('"/recipes" does NOT activate on prefix sibling "/recipes-archive" (WR-01)', () => {
    expect(isNavActive('/recipes-archive', '/recipes')).toBe(false);
  });

  it('"/events" does NOT activate on prefix sibling "/events-2026" (WR-01)', () => {
    expect(isNavActive('/events-2026', '/events')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IN-01: component-level aria-current only on a true match.
//
// Re-mocks usePathname per-test so the predicate is exercised through the
// rendered NavLink, not just the helper. Proves the prefix-sibling and
// root-guard cases reach the DOM correctly.
// ---------------------------------------------------------------------------

describe('IN-01: NavLink aria-current reflects the fixed predicate', () => {
  it('emits aria-current="page" on a child route ("/recipes/123" → "/recipes")', () => {
    mockUsePathname.mockReturnValue('/recipes/123');
    const { container } = render(
      <NavLink href="/recipes">Recipes</NavLink>
    );
    expect(container.querySelector('a')!.getAttribute('aria-current')).toBe('page');
  });

  it('does NOT emit aria-current on prefix sibling ("/recipes-archive" → "/recipes")', () => {
    mockUsePathname.mockReturnValue('/recipes-archive');
    const { container } = render(
      <NavLink href="/recipes">Recipes</NavLink>
    );
    expect(container.querySelector('a')!.getAttribute('aria-current')).toBeNull();
  });

  it('Home is inactive on "/recipes" but active on "/"', () => {
    mockUsePathname.mockReturnValue('/recipes');
    const { container: inactive } = render(
      <NavLink href="/">Home</NavLink>
    );
    expect(inactive.querySelector('a')!.getAttribute('aria-current')).toBeNull();

    mockUsePathname.mockReturnValue('/');
    const { container: active } = render(
      <NavLink href="/">Home</NavLink>
    );
    expect(active.querySelector('a')!.getAttribute('aria-current')).toBe('page');
  });
});
