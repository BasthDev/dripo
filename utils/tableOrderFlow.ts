import type { Href } from 'expo-router';
import type { CartItem } from '../store/useCartStore';
import { useCartStore } from '../store/useCartStore';
import { usePosStore } from '../store/usePosStore';
import { printReceipt } from './bluetoothPrinter';
import { buildTableOrderReceiptTx, cartToTableLines } from './tableOrder';

export type TableOrderNavFrom = 'orders' | 'pos';

export const TABLE_ORDER_ROUTES = {
  tables: '/orders' as const,
  selectTable: '/orders/select-table' as const,
  pos: '/pos' as const,
  success: '/pos/table-order-success' as const,
};

type TableOrderRouter = {
  push: (href: Href) => void;
  replace: (href: Href) => void;
  back: () => void;
};

export function navigateToEditTable(router: Pick<TableOrderRouter, 'push'>, tableId: string) {
  router.push({
    pathname: TABLE_ORDER_ROUTES.pos,
    params: { tableId, from: 'orders' },
  });
}

export function navigateToSelectTable(router: Pick<TableOrderRouter, 'push'>) {
  router.push({
    pathname: TABLE_ORDER_ROUTES.selectTable,
    params: { from: 'pos' },
  });
}

export function leaveTableSale(router: Pick<TableOrderRouter, 'replace' | 'back'>, from?: string) {
  if (from === 'orders') {
    router.replace(TABLE_ORDER_ROUTES.tables);
  } else {
    router.back();
  }
}

/** Save lines to table, auto-print, then open success screen (Majoo-style). */
export async function saveTableOrderAndContinue(
  router: Pick<TableOrderRouter, 'replace'>,
  input: {
    tableId: string;
    items: CartItem[];
    orderNote?: string;
    navFrom: TableOrderNavFrom;
    /** Add to existing table lines instead of replacing the whole order */
    mergeLines?: boolean;
  }
): Promise<string | null> {
  const table = usePosStore.getState().diningTables.find(t => t.id === input.tableId);
  if (!table || !input.items.length) return null;

  const { upsertOpenTableOrder, categories, modifiers, storeSettings, connectedPrinter } =
    usePosStore.getState();

  const orderId = upsertOpenTableOrder({
    tableId: input.tableId,
    lines: cartToTableLines(input.items),
    orderNote: input.orderNote?.trim() || undefined,
    mergeLines: input.mergeLines,
  });

  const order = usePosStore.getState().tableOrders.find(o => o.id === orderId);
  const documentNo = order?.documentNo ?? '—';

  const receiptTx = buildTableOrderReceiptTx(input.items, categories, modifiers, {
    orderId,
    documentNo,
    tableName: table.name,
    zone: table.zone,
    orderNote: input.orderNote?.trim() || undefined,
  });

  if (connectedPrinter) {
    try {
      await printReceipt(receiptTx, storeSettings);
    } catch (e) {
      console.error('[tableOrderFlow] Auto-print error:', e);
    }
  }

  useCartStore.getState().clearCart();

  const savedLines = encodeURIComponent(
    JSON.stringify(cartToTableLines(input.items))
  );

  router.replace({
    pathname: TABLE_ORDER_ROUTES.success,
    params: {
      orderId,
      from: input.navFrom,
      tableId: input.tableId,
      savedLines,
    },
  });

  return orderId;
}
