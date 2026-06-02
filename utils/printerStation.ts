import type { Category, PrinterStation, PrinterStationId } from '../store/usePosStore';

export type PrinterStationRole = 'cashier' | 'bar' | 'kitchen';

export const PRINTER_STATION_META: Record<
  PrinterStationId,
  { label: string; role: PrinterStationRole }
> = {
  'printer-1': { label: 'Cashier', role: 'cashier' },
  'printer-2': { label: 'Bar', role: 'bar' },
  'printer-3': { label: 'Kitchen', role: 'kitchen' },
};

export function getStationLabel(station: Pick<PrinterStation, 'id'>): string {
  return PRINTER_STATION_META[station.id]?.label ?? station.id;
}

export function getStationRole(station: Pick<PrinterStation, 'id'>): PrinterStationRole {
  return PRINTER_STATION_META[station.id]?.role ?? 'cashier';
}

export function isKitchenSlipStation(station: Pick<PrinterStation, 'id'>): boolean {
  const role = getStationRole(station);
  return role === 'bar' || role === 'kitchen';
}

export function isCashierStation(station: Pick<PrinterStation, 'id'>): boolean {
  return getStationRole(station) === 'cashier';
}

/** Short id shown on slips (e.g. A1B2C3D4). */
export function formatPrintTxId(id: string): string {
  const compact = (id || '').replace(/-/g, '').trim();
  if (!compact) return '--------';
  return compact.substring(0, 8).toUpperCase();
}

/** Station can send jobs: enabled, paired, and at least one category chosen. */
export function stationReadyToPrint(station: PrinterStation): boolean {
  return Boolean(station.enabled && station.device && station.categoryIds.length > 0);
}

/** Item prints on this station only when its category is explicitly assigned. */
export function stationMatchesCategory(
  station: PrinterStation,
  categoryId?: string
): boolean {
  if (!station.categoryIds.length) return false;
  if (!categoryId) return false;
  return station.categoryIds.includes(categoryId);
}

export function categorySummary(
  station: PrinterStation,
  categories: Category[]
): string {
  if (!station.categoryIds.length) return 'No categories selected';
  if (station.categoryIds.length === categories.length && categories.length > 0) {
    return 'All categories';
  }
  const names = station.categoryIds
    .map(id => categories.find(c => c.id === id)?.name)
    .filter(Boolean);
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export function selectAllCategoryIds(categories: Category[]): string[] {
  return categories.map(c => c.id);
}

export function categoryPickerHint(role: PrinterStationRole): string {
  if (role === 'cashier') {
    return 'Assign categories for checker slips and payment receipts (e.g. all categories, or only items you verify at the counter).';
  }
  if (role === 'bar') {
    return 'Assign drink categories (e.g. Coffee, Tea). Items in these categories print on Bar when saving a table order.';
  }
  return 'Assign food categories (e.g. Mains, Snacks). Items in these categories print on Kitchen when saving a table order.';
}
