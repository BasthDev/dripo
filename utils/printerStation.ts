import type { Category, PrinterStation } from '../store/usePosStore';

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
