import { Typography } from '../components/ui';

/** Format amount as Indonesian Rupiah. */
export function formatRp(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Shrink font size for long currency strings so values fit on one line.
 * @param amount numeric value (uses digit length after formatting)
 * @param base default headline size
 */
export function rupiahFontSize(amount: number, base = Typography.xxl): number {
  const digits = Math.round(Math.abs(amount)).toLocaleString('id-ID').length;
  if (digits <= 7) return base;
  if (digits <= 9) return base - 2;
  if (digits <= 11) return base - 4;
  if (digits <= 13) return base - 6;
  return Math.max(Typography.sm, base - 8);
}
