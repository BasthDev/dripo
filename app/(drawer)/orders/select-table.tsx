import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import TableGridTile from '../../../components/orders/TableGridTile';
import { Button, Colors, Header, Spacing } from '../../../components/ui';
import { formatRp } from '../../../utils/formatCurrency';
import { selectCartTotal, useCartStore } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';
import {
  getTableGridColumns,
  getTableTileSize,
  useDeviceLayout,
} from '../../../hooks/useDeviceLayout';
import { useOpenTableTotalsByTableId } from '../../../utils/tableOrder';
import {
  saveTableOrderAndContinue,
  type TableOrderNavFrom,
} from '../../../utils/tableOrderFlow';

export default function SelectTableScreen() {
  const router = useRouter();
  const { from = 'pos' } = useLocalSearchParams<{ from?: TableOrderNavFrom }>();
  const { width } = useDeviceLayout();
  const { items, orderNote } = useCartStore();
  const cartTotal = useCartStore(selectCartTotal);
  const tableZones = usePosStore(s => s.tableZones);
  const diningTables = usePosStore(s => s.diningTables);
  const tableOrders = usePosStore(s => s.tableOrders);
  const totalsByTable = useOpenTableTotalsByTableId();

  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const cols = getTableGridColumns(width);
  const tileSize = getTableTileSize(width, cols, Spacing.lg, Spacing.sm);
  const tileHeight = tileSize * 0.92;

  useFocusEffect(
    useCallback(() => {
      const cartItems = useCartStore.getState().items;
      if (!cartItems.length) {
        router.replace({ pathname: '/pos', params: { from } });
      }
    }, [router, from])
  );

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

  const assignTable = (tableId: string) => {
    const hasOpen = !!getOpenOrder(tableId);
    void saveTableOrderAndContinue(router, {
      tableId,
      items,
      orderNote,
      navFrom: from === 'orders' ? 'orders' : 'pos',
      mergeLines: hasOpen,
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title="Select table"
        subtitle="Choose where to send this order"
        onBack={() => router.back()}
      />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {items.length} item(s) · {formatRp(cartTotal)}
        </Text>
        <Text style={styles.summaryHint}>Tap a table to assign this order</Text>
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
          <Text style={styles.emptyText}>No tables in this area. Add tables in Manage.</Text>
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
            const hasOpen = !!getOpenOrder(item.id);
            const existingTotal = totalsByTable.get(item.id) ?? 0;

            return (
              <TableGridTile
                name={item.name}
                zone={item.zone}
                hasOrder={hasOpen}
                total={existingTotal}
                width={tileSize}
                height={tileHeight}
                hint={hasOpen ? 'Will add items' : 'Assign here'}
                onPress={() => assignTable(item.id)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summary: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 2,
  },
  summaryText: { color: Colors.text, fontWeight: '800', fontSize: 15 },
  summaryHint: { color: Colors.textMuted, fontSize: 12 },
  areaBar: { paddingLeft: Spacing.lg, paddingBottom: Spacing.sm },
  grid: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  gridRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  empty: { flex: 1, padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, textAlign: 'center' },
});
