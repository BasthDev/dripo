/** True when pathname is on POS stack (sale screen and nested routes). */
export function isPosRouteActive(pathname: string): boolean {
  return pathname === '/pos' || pathname.startsWith('/pos/');
}

export function isDashboardActive(pathname: string): boolean {
  return pathname === '/' || pathname === '' || pathname.endsWith('/index');
}

export function isRouteActive(pathname: string, segment: string): boolean {
  if (segment === 'pos') return isPosRouteActive(pathname);
  if (segment === 'dashboard') return isDashboardActive(pathname);
  return pathname === segment || pathname.startsWith(`${segment}/`);
}
