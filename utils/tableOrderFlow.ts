import type { Href } from 'expo-router';
import type { CartItem } from '../store/useCartStore';
import { useCartStore } from '../store/useCartStore';
import { usePosStore } from '../store/usePosStore';
import { printReceipt } from './bluetoothPrinter';
import { buildTableOrderReceiptTx, cartToTableLines } from './tableOrder';

export type TableOrderNavFrom = 'orders' | 'pos';

export type TableSaleMode = 'add' | 'edit';

export const TABLE_ORDER_ROUTES = {
  tables: '/orders' as const,
  tableDetail: '/orders/[tableId]' as const,
  selectTable: '/orders/select-table' as const,
  pos: '/pos' as const,
  payment: '/pos/payment' as const,
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
    params: { tableId, from: 'orders', mode: 'edit' },
  });
}

export function navigateToTableOrderDetail(
  router: Pick<TableOrderRouter, 'push'>,
  tableId: string
) {
  router.push({
    pathname: '/orders/[tableId]',
    params: { tableId },
  });
}

/** Open sale with empty cart — only new items for this table. */
export function navigateToAddTableItems(
  router: Pick<TableOrderRouter, 'push'>,
  tableId: string
) {
  const { clearCart, setTableSession } = useCartStore.getState();
  clearCart();
  setTableSession(tableId);
  router.push({
    pathname: TABLE_ORDER_ROUTES.pos,
    params: { tableId, from: 'orders', mode: 'add' },
  });
}

/** Pay open table order without visiting the sale screen. */
export function navigateToPayTable(
  router: Pick<TableOrderRouter, 'push'>,
  tableId: string
) {
  const loaded = useCartStore.getState().loadTableOrderIntoCart(tableId);
  if (!loaded) return false;
  router.push({
    pathname: TABLE_ORDER_ROUTES.payment,
    params: { from: 'orders', tableId },
  });
  return true;
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

/** After saving while editing a table order — return to table detail. */
export function replaceAfterTableOrderSave(
  router: Pick<TableOrderRouter, 'replace'>,
  tableId?: string
) {
  if (tableId) {
    router.replace({
      pathname: '/orders/[tableId]',
      params: { tableId },
    });
    return;
  }
  router.replace(TABLE_ORDER_ROUTES.tables);
}

/** After saving new items / new table order — return to sale screen. */
export function replaceAfterTableOrderSale(
  router: Pick<TableOrderRouter, 'replace'>,
  opts?: { tableId?: string; navFrom?: TableOrderNavFrom; saleMode?: TableSaleMode }
) {
  const { tableId, navFrom = 'orders', saleMode = 'add' } = opts ?? {};
  if (tableId) {
    router.replace({
      pathname: TABLE_ORDER_ROUTES.pos,
      params: { tableId, from: navFrom, mode: saleMode },
    });
    return;
  }
  router.replace(TABLE_ORDER_ROUTES.pos);
}

/** Save lines to table, auto-print, then open success screen (Majoo-style). */
export async function saveTableOrderAndContinue(
  router: Pick<TableOrderRouter, 'replace'>,
  input: {
    tableId: string;
    items: CartItem[];
    orderNote?: string;
    navFrom: TableOrderNavFrom;
    /** add = new lines to table; edit = replace flow from table detail */
    saleMode?: TableSaleMode;
    /** Add to existing table lines instead of replacing the whole order */
    mergeLines?: boolean;
  }
): Promise<string | null> {
  const table = usePosStore.getState().diningTables.find(t => t.id === input.tableId);
  if (!table || !input.items.length) return null;

  const { upsertOpenTableOrder, categories, modifiers, storeSettings, connectedPrinter } =
    usePosStore.getState();

  const existingOpen = usePosStore
    .getState()
    .tableOrders.find(o => o.tableId === input.tableId && o.status === 'OPEN');

  const orderId = upsertOpenTableOrder({
    tableId: input.tableId,
    lines: cartToTableLines(input.items),
    orderNote: input.orderNote?.trim() || undefined,
    mergeLines: input.mergeLines ?? !!existingOpen,
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
      saleMode: input.saleMode ?? (input.navFrom === 'orders' ? 'add' : undefined),
    },
  });

  return orderId;
}
