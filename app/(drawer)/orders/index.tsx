import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button, Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';
import { useOpenTableTotalsByTableId } from '../../../utils/tableOrder';
import { navigateToEditTable } from '../../../utils/tableOrderFlow';

const TABLE_EMPTY_BG = '#FFFFFF';
const TABLE_OPEN_BG = '#E8D5B5';

export default function TableOrdersScreen() {
  const router = useRouter();
  const { showConfirm, AppPopup } = useAppPopup();
  const { width } = useWindowDimensions();
  const tableZones = usePosStore(s => s.tableZones);
  const diningTables = usePosStore(s => s.diningTables);
  const tableOrders = usePosStore(s => s.tableOrders);
  const clearTable = usePosStore(s => s.clearTable);
  const totalsByTable = useOpenTableTotalsByTableId();

  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;
  const tileSize = (width - Spacing.lg * 2 - Spacing.sm * (cols - 1)) / cols;

  const filteredTables = useMemo(() => {
    const list = areaFilter
      ? diningTables.filter(t => t.zone === areaFilter)
      : diningTables;
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [diningTables, areaFilter]);

  const getOpenOrder = (tableId: string) => {
    const o = tableOrders.find(x => x.tableId === tableId);
    return o?.status === 'OPEN' ? o : undefined;
  };

  const handleTablePress = (tableId: string) => {
    const order = getOpenOrder(tableId);
    if (!order) {
      return;
    }
    navigateToEditTable(router, tableId);
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
        subtitle="White = free · brown = open order · tap to update items"
        actions={[
          {
            icon: 'settings-outline',
            onPress: () => router.push('/orders/manage'),
          },
        ]}
      />

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
            Add tables and areas (Indoor, Outdoor…) in Manage Tables. New orders start from Sale → Save table order.
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
          contentContainerStyle={styles.grid}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          extraData={totalsByTable}
          renderItem={({ item }) => {
            const order = getOpenOrder(item.id);
            const bg = order ? TABLE_OPEN_BG : TABLE_EMPTY_BG;
            const total = totalsByTable.get(item.id) ?? 0;

            return (
              <Pressable
                style={[
                  styles.tableTile,
                  {
                    width: tileSize,
                    height: tileSize * 0.85,
                    backgroundColor: bg,
                  },
                ]}
                disabled={!order}
                onPress={() => handleTablePress(item.id)}
                onLongPress={() => handleLongPress(item.id, item.name)}
              >
                <Text style={styles.tableName}>{item.name}</Text>
                <Text style={styles.tableZone}>{item.zone}</Text>
                {order ? (
                  <>
                    <Text style={styles.tableStatus}>Open order</Text>
                    {total > 0 ? (
                      <Text style={styles.tableTotal}>Rp {total.toLocaleString()}</Text>
                    ) : null}
                    <Text style={styles.tapHint}>Tap to update</Text>
                  </>
                ) : (
                  <Text style={styles.tableFree}>No order</Text>
                )}
              </Pressable>
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
  areaBar: { paddingLeft: Spacing.lg, paddingVertical: Spacing.sm },
  grid: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  gridRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  tableTile: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tableName: {
    color: Colors.text,
    fontWeight: '800',
    fontSize: Typography.md,
    textAlign: 'center',
  },
  tableZone: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  tableStatus: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  tableTotal: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  tapHint: { color: Colors.primary, fontSize: 9, marginTop: 4, fontWeight: '600' },
  tableFree: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
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
