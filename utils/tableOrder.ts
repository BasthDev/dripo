import { useMemo } from 'react';
import { getCartLineUnitPrice, type CartItem } from '../store/useCartStore';
import type { Category, Product, ProductModifier, TableOrderLine } from '../store/usePosStore';
import { usePosStore } from '../store/usePosStore';
import { getModifierPriceDelta } from './modifierUtils';

export function cartToTableLines(items: CartItem[]): TableOrderLine[] {
  return items.map(i => ({
    productId: i.product.id,
    quantity: i.quantity,
    note: i.note,
    modifierIds: i.modifierIds?.length ? i.modifierIds : undefined,
  }));
}

export { mergeTableOrderLines } from './tableOrderLines';

export function tableLinesToCart(
  lines: TableOrderLine[],
  products: Product[]
): CartItem[] {
  const result: CartItem[] = [];
  for (const line of lines) {
    const product = products.find(p => p.id === line.productId);
    if (!product || line.quantity <= 0) continue;
    result.push({
      cartItemId: Math.random().toString(36).slice(2, 11),
      product,
      quantity: line.quantity,
      note: line.note,
      modifierIds: line.modifierIds,
    });
  }
  return result;
}

export function estimateOrderTotal(
  lines: TableOrderLine[],
  products: Product[],
  getModifierDelta: (modifierIds: string[]) => number
): number {
  return lines.reduce((sum, line) => {
    const p = products.find(x => x.id === line.productId);
    if (!p) return sum;
    const mods = getModifierDelta(line.modifierIds ?? []);
    return sum + (p.sellPrice + mods) * line.quantity;
  }, 0);
}

/** Receipt payload for kitchen / bar print (same shape as sale receipt). */
export function buildTableOrderReceiptTx(
  items: CartItem[],
  categories: Category[],
  modifiers: ProductModifier[],
  meta: {
    orderId: string;
    documentNo: string;
    tableName: string;
    zone: string;
    orderNote?: string;
  }
) {
  const timestamp = new Date().toISOString();
  const txItems = items.map(cartItem => {
    const unitSell = getCartLineUnitPrice(cartItem);
    const category = categories.find(c => c.id === cartItem.product.categoryId);
    const appliedModifiers = (cartItem.modifierIds ?? [])
      .map(id => modifiers.find(m => m.id === id)?.name)
      .filter((n): n is string => !!n);

    return {
      productId: cartItem.product.id,
      name: cartItem.product.name,
      sku: cartItem.product.sku,
      categoryName: category?.name,
      quantity: cartItem.quantity,
      sellPrice: unitSell,
      cost: 0,
      note: cartItem.note,
      appliedModifiers: appliedModifiers.length ? appliedModifiers : undefined,
    };
  });

  const totalAmount = items.reduce(
    (sum, item) => sum + getCartLineUnitPrice(item) * item.quantity,
    0
  );

  return {
    id: meta.orderId,
    timestamp,
    items: txItems,
    totalAmount,
    paymentMethod: `TABLE ORDER · ${meta.documentNo}`,
    orderNote:
      meta.orderNote?.trim() ||
      `Table ${meta.tableName} · ${meta.zone} · Not paid yet`,
    status: 'COMPLETED' as const,
    tableName: meta.tableName,
    zone: meta.zone,
    documentNo: meta.documentNo,
  };
}

/** Live OPEN-order totals per table (updates when orders/products/modifiers change). */
export function useOpenTableTotalsByTableId(): Map<string, number> {
  const tableOrders = usePosStore(s => s.tableOrders);
  const products = usePosStore(s => s.products);
  const modifiers = usePosStore(s => s.modifiers);

  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const order of tableOrders) {
      if (order.status !== 'OPEN') continue;
      totals.set(
        order.tableId,
        estimateOrderTotal(order.lines, products, ids =>
          getModifierPriceDelta(ids, modifiers)
        )
      );
    }
    return totals;
  }, [tableOrders, products, modifiers]);
}
