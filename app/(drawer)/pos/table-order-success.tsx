import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import PaymentSuccessView, {
  type PaymentSuccessData,
  type TableOrderLineSummary,
} from '../../../components/pos/PaymentSuccessView';
import { Colors } from '../../../components/ui';
import { getCartLineUnitPrice, useCartStore } from '../../../store/useCartStore';
import type { TableOrderLine } from '../../../store/usePosStore';
import { usePosStore } from '../../../store/usePosStore';
import { printReceipt } from '../../../utils/bluetoothPrinter';
import { buildTableOrderReceiptTx, tableLinesToCart } from '../../../utils/tableOrder';
import { TABLE_ORDER_ROUTES, replaceAfterTableOrderSale, replaceAfterTableOrderSave, type TableSaleMode } from '../../../utils/tableOrderFlow';

function parseSavedLines(raw: string | undefined): TableOrderLine[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as TableOrderLine[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function TableOrderSuccessScreen() {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const {
    orderId = '',
    tableId = '',
    savedLines: savedLinesParam = '',
    saleMode = '',
    from = 'pos',
  } = useLocalSearchParams<{
    orderId?: string;
    tableId?: string;
    savedLines?: string;
    saleMode?: TableSaleMode | '';
    from?: 'orders' | 'pos';
  }>();

  const returnToSale = saleMode !== 'edit';

  const order = usePosStore(s => s.tableOrders.find(o => o.id === orderId));
  const table = usePosStore(s => s.diningTables.find(t => t.id === (tableId || order?.tableId)));
  const products = usePosStore(s => s.products);
  const categories = usePosStore(s => s.categories);
  const modifiers = usePosStore(s => s.modifiers);
  const storeSettings = usePosStore(s => s.storeSettings);
  const connectedPrinter = usePosStore(s => s.connectedPrinter);

  const savedLines = useMemo(
    () => parseSavedLines(savedLinesParam),
    [savedLinesParam]
  );

  const displayItems = useMemo(() => {
    const lines = savedLines ?? order?.lines ?? [];
    if (!lines.length) return [];
    return tableLinesToCart(lines, products);
  }, [savedLines, order?.lines, products]);

  const lineItems: TableOrderLineSummary[] = useMemo(
    () =>
      displayItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        lineTotal: getCartLineUnitPrice(item) * item.quantity,
        note: item.note,
      })),
    [displayItems]
  );

  const total = useMemo(
    () => lineItems.reduce((s, l) => s + l.lineTotal, 0),
    [lineItems]
  );

  const itemsCount = useMemo(
    () => displayItems.reduce((s, i) => s + i.quantity, 0),
    [displayItems]
  );

  const data: PaymentSuccessData = useMemo(
    () => ({
      mode: 'tableOrder',
      txId: orderId,
      timestamp: order?.updatedAt ?? new Date().toISOString(),
      total,
      change: 0,
      itemsCount,
      method: 'TABLE ORDER',
      orderNote: order?.orderNote,
      tableName: table?.name,
      tableZone: table?.zone,
      documentNo: order?.documentNo,
      lineItems,
    }),
    [order, orderId, table, total, itemsCount, lineItems]
  );

  const handlePrint = useCallback(async () => {
    if (!order || !table || !connectedPrinter || !displayItems.length) return;
    const receiptTx = buildTableOrderReceiptTx(displayItems, categories, modifiers, {
      orderId: order.id,
      documentNo: order.documentNo,
      tableName: table.name,
      zone: table.zone,
      orderNote: order.orderNote,
    });
    try {
      await printReceipt(receiptTx, storeSettings);
    } catch (e) {
      console.error('[TableOrderSuccess] Print error:', e);
    }
  }, [order, table, connectedPrinter, displayItems, categories, modifiers, storeSettings]);

  const handleDone = useCallback(() => {
    clearCart();
    const tid = tableId || order?.tableId;
    if (returnToSale) {
      replaceAfterTableOrderSale(router, {
        tableId: tid || undefined,
        navFrom: from === 'orders' ? 'orders' : 'pos',
        saleMode: 'add',
      });
    } else {
      replaceAfterTableOrderSave(router, tid || undefined);
    }
  }, [clearCart, router, tableId, order?.tableId, returnToSale, from]);

  useFocusEffect(
    useCallback(() => {
      if (!orderId) {
        clearCart();
        router.replace(TABLE_ORDER_ROUTES.tables);
        return;
      }
      const liveOrder = usePosStore.getState().tableOrders.find(o => o.id === orderId);
      if (!liveOrder) {
        clearCart();
        const tid = tableId || order?.tableId;
        if (returnToSale) {
          replaceAfterTableOrderSale(router, {
            tableId: tid || undefined,
            navFrom: from === 'orders' ? 'orders' : 'pos',
            saleMode: 'add',
          });
        } else {
          replaceAfterTableOrderSave(router, tid || undefined);
        }
      }
    }, [orderId, tableId, order?.tableId, returnToSale, from, clearCart, router])
  );

  if (!orderId || !order) {
    return null;
  }

  return (
    <View style={styles.container}>
      <PaymentSuccessView
        data={data}
        onDone={handleDone}
        doneLabel={returnToSale ? 'Back to sale' : 'Back to table'}
        onPrint={connectedPrinter ? handlePrint : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
