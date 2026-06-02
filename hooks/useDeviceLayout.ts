import { useWindowDimensions } from 'react-native';

/** Shared breakpoints — phone vs tablet/iPad. */
export const TABLET_MIN_WIDTH = 768;
export const SPLIT_LAYOUT_MIN_WIDTH = 600;

export function useDeviceLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= TABLET_MIN_WIDTH;
  const isPhone = !isTablet;
  /** Side-by-side panels (POS cart, payment, success, table detail). */
  const isWideLayout = isTablet || isLandscape;
  /** 60/40 success / payment split */
  const isSplitLayout = width >= SPLIT_LAYOUT_MIN_WIDTH || isLandscape;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isPhone,
    isWideLayout,
    isSplitLayout,
  };
}

/** Table floor plan grid columns from available width. */
export function getTableGridColumns(contentWidth: number): number {
  if (contentWidth >= 900) return 5;
  if (contentWidth >= TABLET_MIN_WIDTH) return 4;
  if (contentWidth >= 400) return 3;
  return 2;
}

export function getTableTileSize(
  contentWidth: number,
  cols: number,
  horizontalPadding = 16,
  gap = 8
): number {
  const safeCols = Math.max(1, cols);
  return (contentWidth - horizontalPadding * 2 - gap * (safeCols - 1)) / safeCols;
}
