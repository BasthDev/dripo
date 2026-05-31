import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Colors,
  EmptyStateCard,
  FlatListCard,
  Header,
  Radius,
  Spacing,
  Typography,
} from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';
import { formatQtyWithUnit, ingredientUnit } from '../../../utils/ingredientUnits';

type Tab = 'received' | 'orders';

export default function PurchasesScreen() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(
    params.tab === 'orders' ? 'orders' : 'received'
  );
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  const stockIns = usePosStore(s => s.stockIns);
  const purchaseOrders = usePosStore(s => s.purchaseOrders);
  const ingredients = usePosStore(s => s.ingredients);
  const receivePurchaseOrder = usePosStore(s => s.receivePurchaseOrder);
  const cancelPurchaseOrder = usePosStore(s => s.cancelPurchaseOrder);

  useEffect(() => {
    if (params.tab === 'orders') setTab('orders');
    if (params.tab === 'received') setTab('received');
  }, [params.tab]);

  const received = useMemo(
    () => [...stockIns].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [stockIns]
  );

  const orders = useMemo(
    () => [...purchaseOrders].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [purchaseOrders]
  );

  const openReceiveStock = () => router.push('/procurement/stock');
  const openNewOrder = () => router.push('/procurement/purchase-order-create');

  const handleReceivePo = (poId: string, docNo: string) => {
    const stockInId = receivePurchaseOrder(poId, true);
    if (!stockInId) {
      showMessage({
        title: 'Receive failed',
        description: 'Items may be missing from inventory. Open the order and check lines.',
        icon: 'alert-circle-outline',
      });
      return;
    }
    setTab('received');
    setExpandedPoId(null);
  };

  const headerAction =
    tab === 'received'
      ? { icon: 'add' as const, onPress: openReceiveStock }
      : { icon: 'add' as const, onPress: openNewOrder };

  return (
    <View style={styles.container}>
      <Header
        title="Purchases"
        subtitle="Receive order = stock + history (one step)"
        actions={[headerAction]}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'received' && styles.tabActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>
            Received ({received.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'orders' && styles.tabActive]}
          onPress={() => setTab('orders')}
        >
          <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>
            Orders ({orders.filter(o => o.status === 'DRAFT').length} open)
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'received' ? (
        received.length === 0 ? (
          <View style={styles.empty}>
            <EmptyStateCard
              icon="download-outline"
              title="No purchases yet"
              description="Receive a purchase order on the Orders tab, or receive stock manually."
              actionLabel="Receive stock"
              onAction={openReceiveStock}
            />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={received}
            keyExtractor={item => item.id}
            extraData={received.length}
            renderItem={({ item }) => {
              const d = new Date(item.timestamp);
              const ingById = (id: string) => ingredients.find(i => i.id === id);
              const lineDetail =
                item.lines.length === 1
                  ? (() => {
                      const ing = ingById(item.lines[0].ingredientId);
                      const u = ing ? ingredientUnit(ing.type) : '';
                      return `${item.lines[0].ingredientName}: ${item.lines[0].quantity}${u ? ` ${u}` : ''}`;
                    })()
                  : `${item.lines.length} items`;

              return (
                <FlatListCard
                  title={item.documentNo}
                  subtitle={`${lineDetail}${item.supplierName ? ` · ${item.supplierName}` : ''} · ${d.toLocaleDateString()}`}
                  trailingValue={`Rp ${item.totalAmount.toLocaleString()}`}
                  leftIcon="download-outline"
                  leftIconColor={Colors.primary}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          />
        )
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="clipboard-outline"
            title="No purchase orders"
            description="Create an order, then tap Receive goods — it appears under Received automatically."
            actionLabel="New order"
            onAction={openNewOrder}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={orders}
          keyExtractor={p => p.id}
          extraData={`${orders.length}-${stockIns.length}`}
          renderItem={({ item }) => {
            const d = new Date(item.timestamp);
            const expanded = expandedPoId === item.id;
            const statusColor =
              item.status === 'DRAFT'
                ? Colors.warning
                : item.status === 'RECEIVED'
                  ? Colors.success
                  : Colors.textMuted;

            return (
              <View style={styles.poBlock}>
                <FlatListCard
                  title={item.documentNo}
                  subtitle={`${item.supplierName ?? 'No supplier'} · ${d.toLocaleDateString()}`}
                  trailingValue={`Rp ${item.totalAmount.toLocaleString()}`}
                  leftIcon="clipboard-outline"
                  leftIconColor={Colors.primary}
                  badge={item.status}
                  badgeColor={statusColor}
                  onPress={() =>
                    item.status === 'DRAFT'
                      ? setExpandedPoId(expanded ? null : item.id)
                      : setTab('received')
                  }
                />

                {item.status === 'DRAFT' ? (
                  <View style={styles.poQuickRow}>
                    <Button
                      label="Receive goods"
                      variant="primary"
                      size="sm"
                      iconLeft="checkmark-circle-outline"
                      onPress={() => handleReceivePo(item.id, item.documentNo)}
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() =>
                        setExpandedPoId(expanded ? null : item.id)
                      }
                    >
                      <Text style={styles.detailsBtnText}>
                        {expanded ? 'Hide' : 'Lines'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {expanded && item.status === 'DRAFT' ? (
                  <View style={styles.poDetail}>
                    {item.lines.map(line => {
                      const ing = ingredients.find(
                        i => i.id === line.ingredientId
                      );
                      const unit = ing ? ingredientUnit(ing.type) : 'unit';
                      return (
                        <Text key={line.ingredientId} style={styles.poLine}>
                          {line.ingredientName}:{' '}
                          {formatQtyWithUnit(line.quantity, ing?.type ?? 'QUANTITY')}
                          {' × '}Rp {line.unitCost.toLocaleString()}/{unit}
                        </Text>
                      );
                    })}
                    <Button
                      label="Cancel order"
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        showConfirm({
                          title: 'Cancel order?',
                          description: item.documentNo,
                          confirmLabel: 'Cancel',
                          cancelLabel: 'No',
                          destructive: true,
                          onConfirm: () => cancelPurchaseOrder(item.id),
                        })
                      }
                    />
                  </View>
                ) : null}

                {item.status === 'RECEIVED' ? (
                  <Text style={styles.receivedHint}>In Received tab</Text>
                ) : null}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tabActive: {
    backgroundColor: Colors.primary + '18',
    borderColor: Colors.primary,
  },
  tabText: { color: Colors.textMuted, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: Colors.primary },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  poBlock: { marginBottom: Spacing.sm },
  poQuickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  detailsBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  detailsBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
  poDetail: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  poLine: { color: Colors.textSecondary, fontSize: Typography.xs },
  receivedHint: {
    color: Colors.success,
    fontSize: Typography.xs,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: Spacing.sm,
  },
});
