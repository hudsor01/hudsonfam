/**
 * Active-route predicate shared by the desktop NavLink and the MobileNav.
 *
 * Matches `href` exactly, or any descendant of `href` on a path-segment
 * boundary. The trailing-slash gate prevents prefix-sibling false positives:
 * `/recipes` is active on `/recipes` and `/recipes/chocolate`, but NOT on
 * `/recipes-archive`. The root path "/" only matches exactly.
 */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
