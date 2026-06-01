import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import TableOrderSuccessView from '../../../components/pos/TableOrderSuccessView';
import { Colors } from '../../../components/ui';
import { getCartLineUnitPrice, useCartStore } from '../../../store/useCartStore';
import type { TableOrderLine } from '../../../store/usePosStore';
import { usePosStore } from '../../../store/usePosStore';
import { usePreventScreenBack } from '../../../hooks/usePreventScreenBack';
import { dispatchTableKitchenReprint, hasAnyPrinterConfigured } from '../../../utils/printerRouting';
import { tableLinesToCart } from '../../../utils/tableOrder';
import { TABLE_ORDER_ROUTES, replaceAfterTableOrderSave } from '../../../utils/tableOrderFlow';

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
  } = useLocalSearchParams<{
    orderId?: string;
    tableId?: string;
    savedLines?: string;
  }>();

  usePreventScreenBack(true);

  const order = usePosStore(s => s.tableOrders.find(o => o.id === orderId));
  const table = usePosStore(s => s.diningTables.find(t => t.id === (tableId || order?.tableId)));
  const products = usePosStore(s => s.products);
  const modifiers = usePosStore(s => s.modifiers);

  const savedLines = useMemo(
    () => parseSavedLines(savedLinesParam),
    [savedLinesParam]
  );

  const displayItems = useMemo(() => {
    const lines = savedLines ?? order?.lines ?? [];
    if (!lines.length) return [];
    return tableLinesToCart(lines, products);
  }, [savedLines, order?.lines, products]);

  const total = useMemo(
    () =>
      displayItems.reduce(
        (s, item) => s + getCartLineUnitPrice(item) * item.quantity,
        0
      ),
    [displayItems]
  );

  const handlePrint = useCallback(() => {
    if (!order || !table || !hasAnyPrinterConfigured() || !displayItems.length) return;
    dispatchTableKitchenReprint(displayItems, {
      tableName: table.name,
      zone: table.zone,
      documentNo: order.documentNo,
      orderNote: order.orderNote,
    });
  }, [order, table, displayItems]);

  const handleDone = useCallback(() => {
    clearCart();
    const tid = tableId || order?.tableId;
    replaceAfterTableOrderSave(router, tid || undefined);
  }, [clearCart, router, tableId, order?.tableId]);

  useFocusEffect(
    useCallback(() => {
      if (!orderId) {
        clearCart();
        const tid = tableId || order?.tableId;
        if (tid) {
          replaceAfterTableOrderSave(router, tid);
        } else {
          router.replace(TABLE_ORDER_ROUTES.tables);
        }
        return;
      }
      const liveOrder = usePosStore.getState().tableOrders.find(o => o.id === orderId);
      if (!liveOrder) {
        clearCart();
        const tid = tableId || order?.tableId;
        replaceAfterTableOrderSave(router, tid || undefined);
      }
    }, [orderId, tableId, order?.tableId, clearCart, router])
  );

  if (!orderId || !order) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TableOrderSuccessView
        info={{
          tableName: table?.name,
          tableZone: table?.zone,
          documentNo: order.documentNo,
          orderNote: order.orderNote,
          total,
          timestamp: order.updatedAt ?? new Date().toISOString(),
        }}
        items={displayItems}
        modifiers={modifiers}
        onDone={handleDone}
        doneLabel="Back to table"
        onPrint={hasAnyPrinterConfigured() ? handlePrint : undefined}
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
