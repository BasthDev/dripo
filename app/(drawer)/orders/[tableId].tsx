import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import OrderCartSummary from '../../../components/pos/OrderCartSummary';
import { Button, Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { useDeviceLayout } from '../../../hooks/useDeviceLayout';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { getCartLineUnitPrice } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';
import {
  dispatchTableKitchenReprint,
  hasAnyPrinterConfigured,
} from '../../../utils/printerRouting';
import { tableLinesToCart } from '../../../utils/tableOrder';
import {
  navigateToAddTableItems,
  navigateToEditTable,
  navigateToPayTable,
  TABLE_ORDER_ROUTES,
} from '../../../utils/tableOrderFlow';

export default function TableOrderDetailScreen() {
  const router = useRouter();
  const { tableId = '' } = useLocalSearchParams<{ tableId: string }>();
  const { isWideLayout, isPhone } = useDeviceLayout();
  const { showMessage, AppPopup } = useAppPopup();

  const table = usePosStore(s => s.diningTables.find(t => t.id === tableId));
  const order = usePosStore(s =>
    s.tableOrders.find(o => o.tableId === tableId && o.status === 'OPEN')
  );
  const products = usePosStore(s => s.products);
  const modifiers = usePosStore(s => s.modifiers);

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
    if (!hasAnyPrinterConfigured()) {
      showMessage({
        title: 'No printer',
        description: 'Enable at least one printer in Settings → Printers.',
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
    try {
      dispatchTableKitchenReprint(cartItems, {
        tableName: table.name,
        zone: table.zone,
        orderId: order.id,
      });
      showMessage({
        title: 'Queued',
        description: 'Print job sent to configured printers (one at a time).',
      });
    } catch (e) {
      console.error('[TableOrderDetail] Print error:', e);
      showMessage({
        title: 'Print error',
        description: 'An error occurred while printing.',
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
    }
  }, [order, table, cartItems, showMessage]);

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

  const orderSummary = (
    <>
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
        style={[styles.cartSummary, isPhone && styles.cartSummaryPhone]}
      />
    </>
  );

  const actionButtons = [
    {
      key: 'pay',
      label: 'Payment',
      variant: 'success' as const,
      icon: 'card-outline' as const,
      onPress: handlePayment,
    },
    {
      key: 'add',
      label: 'Add item',
      variant: 'primary' as const,
      icon: 'add-circle-outline' as const,
      onPress: () => navigateToAddTableItems(router, tableId),
    },
    {
      key: 'edit',
      label: 'Edit items',
      variant: 'outline' as const,
      icon: 'create-outline' as const,
      onPress: () => navigateToEditTable(router, tableId),
    },
    {
      key: 'print',
      label: 'Reprint',
      variant: 'outline' as const,
      icon: 'print-outline' as const,
      onPress: () => void handleReprint(),
    },
  ];

  const actions = (
    <View style={[styles.actionsPanel, isPhone && styles.actionsPanelPhone]}>
      <View style={[styles.actionsGrid, isPhone && styles.actionsGridPhone]}>
        {actionButtons.map(btn => (
          <View
            key={btn.key}
            style={isPhone ? styles.actionCellPhone : styles.actionCellWide}
          >
            <Button
              label={btn.label}
              variant={btn.variant}
              iconLeft={btn.icon}
              fullWidth
              onPress={btn.onPress}
              style={styles.actionBtn}
            />
          </View>
        ))}
      </View>
      <Button
        label="Back to Sale"
        variant="outline"
        iconLeft="bag-handle-outline"
        fullWidth
        onPress={() => router.replace('/pos')}
        style={styles.actionBtn}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title={table.name}
        subtitle={`${table.zone} · ${order.documentNo}`}
        onBack={() => router.back()}
      />

      {isWideLayout ? (
        <View style={styles.bodyWide}>
          <View style={styles.itemsPanelWide}>{orderSummary}</View>
          {actions}
        </View>
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {orderSummary}
          {actions}
        </ScrollView>
      )}
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
  bodyScroll: { flex: 1 },
  bodyScrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  bodyWide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  itemsPanelWide: {
    flex: 1,
    minWidth: 0,
  },
  cartSummary: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    minHeight: 320,
  },
  cartSummaryPhone: {
    flex: 0,
    minHeight: 280,
    maxHeight: 420,
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
    width: 300,
    maxWidth: '36%',
    justifyContent: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  actionsPanelPhone: {
    width: '100%',
    maxWidth: '100%',
    flex: 0,
    padding: Spacing.md,
  },
  actionsGrid: {
    gap: Spacing.sm,
  },
  actionsGridPhone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionCellPhone: {
    width: '48%',
    flexGrow: 1,
  },
  actionCellWide: {
    width: '100%',
  },
  actionBtn: {
    minHeight: 52,
  },
});
