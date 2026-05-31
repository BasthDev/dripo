import type { IngredientType } from '../store/usePosStore';

/** Units users can type when buying stock or building recipes. */
export type DisplayUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export type DisplayUnitOption = {
  label: string;
  value: DisplayUnit;
  /** How many base units (g, ml, pcs) equal 1 of this unit */
  factorToBase: number;
};

export function getDisplayUnits(type: IngredientType): DisplayUnitOption[] {
  if (type === 'WEIGHT') {
    return [
      { label: 'Gram (g)', value: 'g', factorToBase: 1 },
      { label: 'Kilogram (kg)', value: 'kg', factorToBase: 1000 },
    ];
  }
  if (type === 'VOLUME') {
    return [
      { label: 'Milliliter (ml)', value: 'ml', factorToBase: 1 },
      { label: 'Liter (L)', value: 'l', factorToBase: 1000 },
    ];
  }
  return [{ label: 'Piece (pcs)', value: 'pcs', factorToBase: 1 }];
}

export function defaultDisplayUnit(type: IngredientType): DisplayUnit {
  if (type === 'WEIGHT') return 'kg';
  if (type === 'VOLUME') return 'l';
  return 'pcs';
}

export function factorToBase(unit: DisplayUnit): number {
  if (unit === 'kg' || unit === 'l') return 1000;
  return 1;
}

/** Convert user-facing amount → stored base amount (g / ml / pcs). */
export function toBaseAmount(amount: number, unit: DisplayUnit): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount * factorToBase(unit);
}

/** Convert stored base amount → display amount in chosen unit. */
export function fromBaseAmount(baseAmount: number, unit: DisplayUnit): number {
  const factor = factorToBase(unit);
  if (factor <= 0) return baseAmount;
  return baseAmount / factor;
}

/**
 * Total purchase price ÷ base quantity → cost per g, ml, or pcs.
 * Example: 1 L @ Rp 25,000 → 25 per ml.
 */
export function calcCostPerUnit(
  totalPrice: number,
  purchaseAmount: number,
  purchaseUnit: DisplayUnit
): number {
  const baseQty = toBaseAmount(purchaseAmount, purchaseUnit);
  if (baseQty <= 0 || !Number.isFinite(totalPrice) || totalPrice < 0) return 0;
  return totalPrice / baseQty;
}

export function formatCostPerUnit(costPerUnit: number, type: IngredientType): string {
  const u = type === 'WEIGHT' ? 'g' : type === 'VOLUME' ? 'ml' : 'pcs';
  return `Rp ${Math.round(costPerUnit).toLocaleString()} / ${u}`;
}

/** Human-readable qty for recipe lists (prefers kg/L when large). */
export function formatRecipeQuantity(baseQty: number, type: IngredientType): string {
  if (type === 'WEIGHT' && baseQty >= 1000) {
    const kg = baseQty / 1000;
    return `${kg % 1 === 0 ? kg : kg.toFixed(2)} kg`;
  }
  if (type === 'VOLUME' && baseQty >= 1000) {
    const l = baseQty / 1000;
    return `${l % 1 === 0 ? l : l.toFixed(2)} L`;
  }
  const u = type === 'WEIGHT' ? 'g' : type === 'VOLUME' ? 'ml' : 'pcs';
  return `${baseQty % 1 === 0 ? baseQty : baseQty.toFixed(1)} ${u}`;
}

export function displayUnitOptionsForDropdown(
  type: IngredientType
): { label: string; value: string }[] {
  return getDisplayUnits(type).map(o => ({ label: o.label, value: o.value }));
}

/** Pick kg/L vs g/ml for editing an existing base quantity. */
export function bestDisplayForBase(
  baseQty: number,
  type: IngredientType
): { amount: string; unit: DisplayUnit } {
  if (type === 'WEIGHT') {
    if (baseQty >= 1000 && baseQty % 1000 === 0) {
      return { amount: String(baseQty / 1000), unit: 'kg' };
    }
    return { amount: String(baseQty), unit: 'g' };
  }
  if (type === 'VOLUME') {
    if (baseQty >= 1000 && baseQty % 1000 === 0) {
      return { amount: String(baseQty / 1000), unit: 'l' };
    }
    return { amount: String(baseQty), unit: 'ml' };
  }
  return { amount: String(baseQty), unit: 'pcs' };
}

/** UI state for qty + purchase-price entry on PO / receive screens. */
export type IngredientLineInputState = {
  qtyAmount: string;
  qtyUnit: DisplayUnit;
  costMode: 'purchase' | 'perBase';
  purchaseAmount: string;
  purchaseUnit: DisplayUnit;
  purchaseTotal: string;
  unitCostPerBase: string;
};

export function defaultIngredientLineInput(ing: {
  type: IngredientType;
  costPerUnit: number;
}): IngredientLineInputState {
  const def = defaultDisplayUnit(ing.type);
  return {
    qtyAmount: '',
    qtyUnit: def,
    costMode: 'purchase',
    purchaseAmount: '1',
    purchaseUnit: def,
    purchaseTotal: '',
    unitCostPerBase: String(ing.costPerUnit),
  };
}

export function resolveIngredientLine(
  state: IngredientLineInputState,
  type: IngredientType
): { baseQty: number; unitCost: number } | null {
  const qtyAmt = parseFloat(state.qtyAmount);
  if (isNaN(qtyAmt) || qtyAmt <= 0) return null;

  const baseQty = toBaseAmount(qtyAmt, state.qtyUnit);

  let unitCost = 0;
  if (state.costMode === 'perBase') {
    unitCost = parseFloat(state.unitCostPerBase);
    if (isNaN(unitCost) || unitCost < 0) return null;
  } else {
    const pAmt = parseFloat(state.purchaseAmount);
    const pTotal = parseFloat(state.purchaseTotal);
    if (isNaN(pAmt) || pAmt <= 0 || isNaN(pTotal) || pTotal < 0) return null;
    unitCost = calcCostPerUnit(pTotal, pAmt, state.purchaseUnit);
    if (unitCost <= 0) return null;
  }

  return { baseQty, unitCost };
}

/** Stock on hand in friendly units (e.g. 2 L, 500 g). */
export function formatStockDisplay(baseQty: number, type: IngredientType): string {
  return formatRecipeQuantity(baseQty, type);
}
