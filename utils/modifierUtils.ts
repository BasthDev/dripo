import type { ProductModifier, RecipeIngredient } from '../store/usePosStore';

export type RecipeStockLine = { ingredientId: string; quantity: number };

export function getModifierPriceDelta(
  modifierIds: string[],
  modifiers: ProductModifier[]
): number {
  return modifierIds.reduce((sum, id) => {
    const mod = modifiers.find(m => m.id === id);
    return sum + (mod?.sellPriceDelta ?? 0);
  }, 0);
}

export function mergeRecipeLines(
  baseLines: RecipeStockLine[],
  modifierIds: string[],
  modifiers: ProductModifier[]
): RecipeStockLine[] {
  const map = new Map<string, number>();
  for (const line of baseLines) {
    map.set(line.ingredientId, (map.get(line.ingredientId) ?? 0) + line.quantity);
  }
  for (const modId of modifierIds) {
    const mod = modifiers.find(m => m.id === modId);
    if (!mod) continue;
    for (const adj of mod.recipeAdjustments) {
      map.set(
        adj.ingredientId,
        (map.get(adj.ingredientId) ?? 0) + adj.quantityDelta
      );
    }
  }
  return Array.from(map.entries())
    .filter(([, qty]) => qty > 0)
    .map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
}

export function recipeIngredientsToLines(
  ingredients: RecipeIngredient[]
): RecipeStockLine[] {
  return ingredients.map(ri => ({
    ingredientId: ri.ingredientId,
    quantity: ri.quantity,
  }));
}

export function computeModifierAwareCost(
  baseCost: number,
  modifierIds: string[],
  modifiers: ProductModifier[],
  ingredients: { id: string; costPerUnit: number }[]
): number {
  let extra = 0;
  for (const modId of modifierIds) {
    const mod = modifiers.find(m => m.id === modId);
    if (!mod) continue;
    for (const adj of mod.recipeAdjustments) {
      const ing = ingredients.find(i => i.id === adj.ingredientId);
      if (ing) extra += ing.costPerUnit * adj.quantityDelta;
    }
  }
  return baseCost + extra;
}

export function getAppliedModifierLabels(
  modifierIds: string[],
  modifiers: ProductModifier[]
): { id: string; name: string; sellPriceDelta: number }[] {
  return modifierIds
    .map(id => modifiers.find(m => m.id === id))
    .filter((m): m is ProductModifier => !!m)
    .map(m => ({ id: m.id, name: m.name, sellPriceDelta: m.sellPriceDelta }));
}
