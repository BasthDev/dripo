import type { IngredientType } from '../store/usePosStore';

export function ingredientUnit(type: IngredientType | string): string {
  if (type === 'WEIGHT') return 'g';
  if (type === 'VOLUME') return 'ml';
  return 'pcs';
}

export function ingredientTypeLabel(type: IngredientType | string): string {
  if (type === 'WEIGHT') return 'Weight';
  if (type === 'VOLUME') return 'Volume';
  return 'Pieces';
}

export function formatQtyWithUnit(qty: number, type: IngredientType | string): string {
  return `${qty} ${ingredientUnit(type)}`;
}
