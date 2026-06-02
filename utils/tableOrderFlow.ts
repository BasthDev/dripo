import type { Href } from 'expo-router';
import type { CartItem } from '../store/useCartStore';
import { useCartStore } from '../store/useCartStore';
import { usePosStore } from '../store/usePosStore';
import { dispatchTableKitchenPrint } from './printerRouting';
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

export function leaveTableSale(
  router: Pick<TableOrderRouter, 'replace' | 'back'>,
  from?: string,
  tableId?: string
) {
  if (from === 'orders') {
    if (tableId) {
      router.replace({
        pathname: '/orders/[tableId]',
        params: { tableId },
      });
    } else {
      router.replace(TABLE_ORDER_ROUTES.tables);
    }
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

  const { upsertOpenTableOrder } = usePosStore.getState();

  const mergeLines =
    input.mergeLines ??
    (input.saleMode === 'add'
      ? true
      : input.saleMode === 'edit'
        ? false
        : false);

  const orderId = upsertOpenTableOrder({
    tableId: input.tableId,
    lines: cartToTableLines(input.items),
    orderNote: input.orderNote?.trim() || undefined,
    mergeLines,
  });

  dispatchTableKitchenPrint(input.items, {
    tableName: table.name,
    zone: table.zone,
    orderId,
  });

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
