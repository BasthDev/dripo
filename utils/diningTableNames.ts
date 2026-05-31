/** Normalize user input — table names are always stored uppercase. */
export function normalizeTableBaseName(input: string): string {
  return input.trim().toUpperCase();
}

/** Build numbered table name from base (e.g. OD + 1 → OD1, TABLE + 2 → TABLE 2). */
export function bulkTableName(base: string, index: number): string {
  const b = normalizeTableBaseName(base);
  if (b.length <= 3 && !/\s/.test(b)) return `${b}${index}`;
  return `${b} ${index}`;
}

/** Preview names for UI (first/last when many). */
export function previewBulkTableNames(base: string, count: number): string {
  const qty = Math.min(Math.max(Math.floor(count), 1), 99);
  const b = normalizeTableBaseName(base);
  if (!b || qty < 1) return '';
  if (qty <= 3) {
    return Array.from({ length: qty }, (_, i) => bulkTableName(b, i + 1)).join(', ');
  }
  return `${bulkTableName(b, 1)}, ${bulkTableName(b, 2)}, … ${bulkTableName(b, qty)}`;
}
