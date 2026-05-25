export const CATEGORY_PALETTE = [
  '#8B5E3C',
  '#6C5CE7',
  '#6FBF73',
  '#E9B949',
  '#5DADE2',
  '#D96C6C',
  '#B08968',
  '#E17055',
  '#00B894',
  '#636E72',
] as const;

export function pickCategoryColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

export function ensureCategoryColor(color: string | undefined, index: number): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : pickCategoryColor(index);
}
