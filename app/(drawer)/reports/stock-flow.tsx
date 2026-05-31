import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import { MOVEMENT_REASON_LABELS } from '../../../utils/inventoryLabels';
import { formatRecipeQuantity } from '../../../utils/ingredientCost';

export default function StockFlowScreen() {
  const router = useRouter();
  const { movements, ingredients } = usePosStore();

  const sortedMovements = [...movements].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <View style={styles.container}>
      <Header title="Stock Flow" subtitle="Inventory Activity Log" onBack={() => router.back()} />
      {sortedMovements.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No inventory movements found.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={sortedMovements}
          keyExtractor={m => m.id}
          renderItem={({ item }) => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const dateStr = new Date(item.timestamp).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const isOut = item.type === 'OUT';
            const qtyLabel = ing
              ? formatRecipeQuantity(Math.abs(item.quantityDiff), ing.type)
              : String(Math.abs(item.quantityDiff));

            return (
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.ingName}>{ing ? ing.name : 'Deleted Ingredient'}</Text>
                  <Text style={styles.meta}>
                    {dateStr} • {MOVEMENT_REASON_LABELS[item.reason] ?? item.reason}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.qty, { color: isOut ? Colors.error : Colors.success }]}>
                    {item.quantityDiff > 0 ? '+' : item.quantityDiff < 0 ? '−' : ''}
                    {qtyLabel}
                  </Text>
                  {item.note && <Text style={styles.note}>{item.note}</Text>}
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textMuted },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  left: { flex: 1, paddingRight: Spacing.md },
  ingName: { color: Colors.text, fontSize: Typography.md, fontWeight: '600' },
  meta: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 4 },
  right: { alignItems: 'flex-end', justifyContent: 'center' },
  qty: { fontSize: Typography.lg, fontWeight: '800' },
  note: { color: Colors.textSecondary, fontSize: 10, marginTop: 2, fontStyle: 'italic' }
});
