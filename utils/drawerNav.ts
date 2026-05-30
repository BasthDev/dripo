/** True when pathname is on POS stack (sale screen and nested routes). */
export function isPosRouteActive(pathname: string): boolean {
  return pathname === '/pos' || pathname.startsWith('/pos/');
}

export function isDashboardActive(pathname: string): boolean {
  return pathname === '/' || pathname === '' || pathname.endsWith('/index');
}

export function isTransactionsActive(pathname: string): boolean {
  return (
    pathname === '/transactions' ||
    pathname.endsWith('/transactions') ||
    pathname.includes('/transactions-month') ||
    pathname.includes('/transactions-detail')
  );
}

export function isReportsActive(pathname: string): boolean {
  if (isTransactionsActive(pathname)) return false;
  return pathname === '/reports' || pathname.startsWith('/reports/');
}

export function isRouteActive(pathname: string, segment: string): boolean {
  if (segment === 'pos') return isPosRouteActive(pathname);
  if (segment === 'dashboard') return isDashboardActive(pathname);
  if (segment === '/reports') return isReportsActive(pathname);
  if (segment === '/transactions') return isTransactionsActive(pathname);
  return pathname === segment || pathname.startsWith(`${segment}/`);
}
