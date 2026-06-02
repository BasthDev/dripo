import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import TableGridTile from '../../../components/orders/TableGridTile';
import { Button, Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import {
  getTableGridColumns,
  getTableTileSize,
  useDeviceLayout,
} from '../../../hooks/useDeviceLayout';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';
import { useOpenTableTotalsByTableId } from '../../../utils/tableOrder';
import { navigateToTableOrderDetail } from '../../../utils/tableOrderFlow';

export default function TableOrdersScreen() {
  const router = useRouter();
  const { showConfirm, AppPopup } = useAppPopup();
  const { width } = useDeviceLayout();
  const tableZones = usePosStore(s => s.tableZones);
  const diningTables = usePosStore(s => s.diningTables);
  const tableOrders = usePosStore(s => s.tableOrders);
  const clearTable = usePosStore(s => s.clearTable);
  const totalsByTable = useOpenTableTotalsByTableId();

  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const cols = getTableGridColumns(width);
  const tileSize = getTableTileSize(width, cols, Spacing.lg, Spacing.sm);
  const tileHeight = tileSize * 0.92;

  const filteredTables = useMemo(() => {
    const list = areaFilter
      ? diningTables.filter(t => t.zone === areaFilter)
      : diningTables;
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [diningTables, areaFilter]);

  const openCount = useMemo(
    () => filteredTables.filter(t => tableOrders.some(o => o.tableId === t.id && o.status === 'OPEN')).length,
    [filteredTables, tableOrders]
  );

  const getOpenOrder = (tableId: string) => {
    const o = tableOrders.find(x => x.tableId === tableId);
    return o?.status === 'OPEN' ? o : undefined;
  };

  const handleTablePress = (tableId: string) => {
    const order = getOpenOrder(tableId);
    if (!order) return;
    navigateToTableOrderDetail(router, tableId);
  };

  const handleLongPress = (tableId: string, tableName: string) => {
    const order = getOpenOrder(tableId);
    if (!order) return;
    showConfirm({
      title: tableName,
      description: 'Clear this table order?',
      confirmLabel: 'Clear',
      destructive: true,
      onConfirm: () => clearTable(tableId),
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title="Table Orders"
        subtitle={`${openCount} open · ${filteredTables.length} tables`}
        actions={[
          {
            icon: 'settings-outline',
            onPress: () => router.push('/orders/manage'),
          },
        ]}
      />

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendFree]} />
          <Text style={styles.legendText}>Free</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendOpen]} />
          <Text style={styles.legendText}>Open order — tap to manage</Text>
        </View>
      </View>

      <View style={styles.areaBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: 'All areas' }, ...tableZones.map(z => ({ id: z, name: z }))]}
          keyExtractor={item => item.id ?? 'all'}
          renderItem={({ item }) => {
            const isActive = areaFilter === item.id;
            return (
              <Button
                label={item.name}
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                onPress={() => setAreaFilter(item.id)}
                style={{ marginRight: Spacing.sm }}
              />
            );
          }}
        />
      </View>

      {filteredTables.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="grid-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No tables yet</Text>
          <Text style={styles.emptyDesc}>
            Add tables and areas in Manage Tables. New orders start from Sale → Save table order.
          </Text>
          <Button
            label="Manage tables"
            variant="primary"
            onPress={() => router.push('/orders/manage')}
          />
        </View>
      ) : (
        <FlatList
          data={filteredTables}
          keyExtractor={t => t.id}
          numColumns={cols}
          key={`cols-${cols}`}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          extraData={totalsByTable}
          renderItem={({ item }) => {
            const order = getOpenOrder(item.id);
            const total = totalsByTable.get(item.id) ?? 0;

            return (
              <TableGridTile
                name={item.name}
                zone={item.zone}
                hasOrder={!!order}
                total={total}
                width={tileSize}
                height={tileHeight}
                disabled={!order}
                hint={order ? 'Tap to manage' : undefined}
                onPress={() => handleTablePress(item.id)}
                onLongPress={() => handleLongPress(item.id, item.name)}
              />
            );
          }}
        />
      )}
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  legendFree: { backgroundColor: Colors.surface },
  legendOpen: { backgroundColor: '#F5EDE3' },
  legendText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  areaBar: { paddingLeft: Spacing.lg, paddingVertical: Spacing.sm },
  grid: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  gridRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: { color: Colors.text, fontWeight: '700', fontSize: Typography.lg },
  emptyDesc: { color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
