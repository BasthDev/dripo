import type { Product, ProductOption, RecipeIngredient } from '../store/usePosStore';
import { getProductSize } from './productSizes';

export type RecipeStockLine = { ingredientId: string; quantity: number };
export type RecipeAdjustment = { ingredientId: string; quantityDelta: number };

export function getOptionPriceDelta(
  optionId: string | undefined,
  options: ProductOption[] | undefined
): number {
  if (!optionId || !options?.length) return 0;
  return options.find(o => o.id === optionId)?.sellPriceDelta ?? 0;
}

export function applyRecipeAdjustments(
  baseLines: RecipeStockLine[],
  adjustments: RecipeAdjustment[]
): RecipeStockLine[] {
  if (!adjustments.length) return baseLines;
  const map = new Map<string, number>();
  for (const line of baseLines) {
    map.set(line.ingredientId, (map.get(line.ingredientId) ?? 0) + line.quantity);
  }
  for (const adj of adjustments) {
    map.set(
      adj.ingredientId,
      (map.get(adj.ingredientId) ?? 0) + adj.quantityDelta
    );
  }
  return Array.from(map.entries())
    .filter(([, qty]) => qty > 0)
    .map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
}

function optionAdjustments(
  optionId: string | undefined,
  options: ProductOption[] | undefined
): RecipeAdjustment[] {
  if (!optionId || !options?.length) return [];
  return options.find(o => o.id === optionId)?.recipeAdjustments ?? [];
}

export function recipeIngredientsToLines(
  ingredients: RecipeIngredient[]
): RecipeStockLine[] {
  return ingredients.map(ri => ({
    ingredientId: ri.ingredientId,
    quantity: ri.quantity,
  }));
}

/** Base recipe + size + selected option — stock & COGS. */
export function buildProductRecipeLines(
  recipeIngredients: RecipeIngredient[],
  product: Product,
  sizeId: string | undefined,
  optionId: string | undefined
): RecipeStockLine[] {
  let lines = recipeIngredientsToLines(recipeIngredients);
  const size = getProductSize(product, sizeId);
  if (size?.recipeAdjustments?.length) {
    lines = applyRecipeAdjustments(lines, size.recipeAdjustments);
  }
  const optAdj = optionAdjustments(optionId, product.options);
  if (optAdj.length) {
    lines = applyRecipeAdjustments(lines, optAdj);
  }
  return lines;
}

export function computeLineCost(
  baseCost: number,
  product: Product,
  sizeId: string | undefined,
  optionId: string | undefined,
  ingredients: { id: string; costPerUnit: number }[]
): number {
  let extra = 0;
  const size = getProductSize(product, sizeId);
  const adjustments = [
    ...(size?.recipeAdjustments ?? []),
    ...optionAdjustments(optionId, product.options),
  ];
  for (const adj of adjustments) {
    const ing = ingredients.find(i => i.id === adj.ingredientId);
    if (ing) extra += ing.costPerUnit * adj.quantityDelta;
  }
  return baseCost + extra;
}

export function getAppliedOption(
  optionId: string | undefined,
  options: ProductOption[] | undefined
): { id: string; name: string; sellPriceDelta: number } | undefined {
  if (!optionId || !options?.length) return undefined;
  const o = options.find(x => x.id === optionId);
  return o ? { id: o.id, name: o.name, sellPriceDelta: o.sellPriceDelta } : undefined;
}
