import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import OrderCartSummary from '../../../components/pos/OrderCartSummary';
import { Button, Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { getCartLineUnitPrice } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';
import { printReceipt } from '../../../utils/bluetoothPrinter';
import { buildTableOrderReceiptTx, tableLinesToCart } from '../../../utils/tableOrder';
import {
  navigateToAddTableItems,
  navigateToEditTable,
  navigateToPayTable,
  TABLE_ORDER_ROUTES,
} from '../../../utils/tableOrderFlow';

export default function TableOrderDetailScreen() {
  const router = useRouter();
  const { tableId = '' } = useLocalSearchParams<{ tableId: string }>();
  const { width, height } = useWindowDimensions();
  const { showMessage, AppPopup } = useAppPopup();

  const table = usePosStore(s => s.diningTables.find(t => t.id === tableId));
  const order = usePosStore(s =>
    s.tableOrders.find(o => o.tableId === tableId && o.status === 'OPEN')
  );
  const products = usePosStore(s => s.products);
  const modifiers = usePosStore(s => s.modifiers);
  const categories = usePosStore(s => s.categories);
  const storeSettings = usePosStore(s => s.storeSettings);
  const connectedPrinter = usePosStore(s => s.connectedPrinter);

  const isWide = width >= 768 || width > height;

  const cartItems = useMemo(() => {
    if (!order?.lines.length) return [];
    return tableLinesToCart(order.lines, products);
  }, [order?.lines, products]);

  const total = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + getCartLineUnitPrice(item) * item.quantity,
        0
      ),
    [cartItems]
  );

  const handleReprint = useCallback(async () => {
    if (!order || !table) return;
    if (!connectedPrinter) {
      showMessage({
        title: 'No printer',
        description: 'Connect a Bluetooth printer in Settings first.',
        icon: 'print-outline',
        iconColor: Colors.warning,
      });
      return;
    }
    if (!cartItems.length) {
      showMessage({
        title: 'Empty order',
        description: 'Nothing to print on this table order.',
        icon: 'cart-outline',
        iconColor: Colors.warning,
      });
      return;
    }
    const receiptTx = buildTableOrderReceiptTx(cartItems, categories, modifiers, {
      orderId: order.id,
      documentNo: order.documentNo,
      tableName: table.name,
      zone: table.zone,
      orderNote: order.orderNote,
    });
    try {
      const success = await printReceipt(receiptTx, storeSettings);
      if (success) {
        showMessage({
          title: 'Printed',
          description: 'Table order receipt sent to printer.',
        });
      } else {
        showMessage({
          title: 'Print failed',
          description: 'Could not print. Check the printer connection in Settings.',
          icon: 'alert-circle-outline',
          iconColor: Colors.error,
        });
      }
    } catch (e) {
      console.error('[TableOrderDetail] Print error:', e);
      showMessage({
        title: 'Print error',
        description: 'An error occurred while printing.',
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
    }
  }, [
    order,
    table,
    connectedPrinter,
    cartItems,
    categories,
    modifiers,
    storeSettings,
    showMessage,
  ]);

  if (!table) {
    return (
      <View style={styles.container}>
        <Header title="Table" onBack={() => router.back()} />
        <Text style={styles.missing}>Table not found.</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Header title={table.name} onBack={() => router.replace(TABLE_ORDER_ROUTES.tables)} />
        <Text style={styles.missing}>No open order on this table.</Text>
        <Button
          label="Back to tables"
          variant="outline"
          onPress={() => router.replace(TABLE_ORDER_ROUTES.tables)}
          style={styles.backBtn}
        />
      </View>
    );
  }

  const handlePayment = () => {
    if (!cartItems.length) {
      showMessage({
        title: 'Empty order',
        description: 'Add items before taking payment.',
        icon: 'cart-outline',
        iconColor: Colors.warning,
      });
      return;
    }
    const ok = navigateToPayTable(router, tableId);
    if (!ok) {
      showMessage({
        title: 'Cannot pay',
        description: 'This table order is no longer open.',
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
    }
  };

  const actionPanel = (
    <View style={[styles.actionsPanel, !isWide && styles.actionsPanelStacked]}>
      <View style={styles.actionsGrid}>
        <View style={styles.actionsGridRow}>
          <View style={styles.gridCell}>
            <Button
              label="Add item"
              variant="primary"
              iconLeft="add-circle-outline"
              size="sm"
              onPress={() => navigateToAddTableItems(router, tableId)}
              style={styles.gridBtn}
            />
          </View>
          <View style={styles.gridCell}>
            <Button
              label="Edit items"
              variant="outline"
              iconLeft="create-outline"
              size="sm"
              onPress={() => navigateToEditTable(router, tableId)}
              style={styles.gridBtn}
            />
          </View>
        </View>
        <View style={styles.actionsGridRow}>
          <View style={styles.gridCell}>
            <Button
              label="Payment"
              variant="success"
              iconLeft="card-outline"
              size="sm"
              onPress={handlePayment}
              style={styles.gridBtn}
            />
          </View>
          <View style={styles.gridCell}>
            <Button
              label="Reprint"
              variant="outline"
              iconLeft="print-outline"
              size="sm"
              onPress={() => void handleReprint()}
              style={styles.gridBtn}
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title={table.name}
        subtitle={`${table.zone} · ${order.documentNo}`}
        onBack={() => router.back()}
      />

      <View style={[styles.body, isWide && styles.bodyWide]}>
        <View style={[styles.itemsPanel, isWide && styles.itemsPanelWide]}>
          {order.orderNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Order note</Text>
              <Text style={styles.noteText}>{order.orderNote}</Text>
            </View>
          ) : null}
          <OrderCartSummary
            items={cartItems}
            modifiers={modifiers}
            total={total}
            title="Table order"
            style={styles.cartSummary}
          />
        </View>

        {isWide ? (
          actionPanel
        ) : (
          <ScrollView
            contentContainerStyle={styles.actionsScroll}
            showsVerticalScrollIndicator={false}
          >
            {actionPanel}
          </ScrollView>
        )}
      </View>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  missing: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg },
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },
  bodyWide: { flexDirection: 'row', alignItems: 'stretch' },
  itemsPanel: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  itemsPanelWide: { flex: 2 },
  cartSummary: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  noteBox: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  noteLabel: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteText: { color: Colors.text, fontSize: Typography.sm },
  actionsPanel: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  actionsPanelStacked: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.md,
  },
  actionsGrid: {
    gap: Spacing.md,
  },
  actionsGridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gridCell: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBtn: {
    width: 200,
    height: 100,
  },
  actionsScroll: { flexGrow: 0 },
});
