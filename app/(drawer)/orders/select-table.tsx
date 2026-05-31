import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Button,
  Colors,
  Header,
  Radius,
  Spacing,
  Typography,
} from '../../../components/ui';
import { selectCartTotal, useCartStore } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';
import { useOpenTableTotalsByTableId } from '../../../utils/tableOrder';
import {
  saveTableOrderAndContinue,
  type TableOrderNavFrom,
} from '../../../utils/tableOrderFlow';

const TABLE_EMPTY_BG = '#FFFFFF';
const TABLE_OPEN_BG = '#E8D5B5';

export default function SelectTableScreen() {
  const router = useRouter();
  const { from = 'pos' } = useLocalSearchParams<{ from?: TableOrderNavFrom }>();
  const { width } = useWindowDimensions();
  const { items, orderNote } = useCartStore();
  const cartTotal = useCartStore(selectCartTotal);
  const tableZones = usePosStore(s => s.tableZones);
  const diningTables = usePosStore(s => s.diningTables);
  const tableOrders = usePosStore(s => s.tableOrders);
  const totalsByTable = useOpenTableTotalsByTableId();

  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;
  const tileSize = (width - Spacing.lg * 2 - Spacing.sm * (cols - 1)) / cols;

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

      {/* <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {items.length} item(s) · Rp {cartTotal.toLocaleString()}
        </Text>
      </View> */}

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
            const bg = hasOpen ? TABLE_OPEN_BG : TABLE_EMPTY_BG;
            const existingTotal = totalsByTable.get(item.id) ?? 0;

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
                onPress={() => assignTable(item.id)}
              >
                <Text style={styles.tableName}>{item.name}</Text>
                <Text style={styles.zoneLabel}>{item.zone}</Text>
                {hasOpen ? (
                  <>
                    <Text style={styles.inUse}>Has open order — will update</Text>
                    {existingTotal > 0 ? (
                      <Text style={styles.tableTotal}>Rp {existingTotal.toLocaleString()}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.free}>Available</Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summary: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  summaryText: { color: Colors.textSecondary, fontWeight: '600' },
  areaBar: { paddingLeft: Spacing.lg, paddingBottom: Spacing.sm },
  grid: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  gridRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  tableTile: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  tableName: {
    color: Colors.text,
    fontWeight: '800',
    fontSize: Typography.md,
    textAlign: 'center',
  },
  zoneLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  tableTotal: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  inUse: { color: Colors.textSecondary, fontSize: 9, marginTop: 4, textAlign: 'center' },
  free: { color: Colors.textMuted, fontSize: 9, marginTop: 4, fontStyle: 'italic' },
  empty: { flex: 1, padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, textAlign: 'center' },
});
