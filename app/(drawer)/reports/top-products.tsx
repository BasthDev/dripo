import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, Colors, Spacing, Radius, Typography } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import { Ionicons } from '@expo/vector-icons';

export default function TopProductsScreen() {
  const router = useRouter();
  const { transactions } = usePosStore();

  // Aggregate across all completed transactions (all time)
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; categoryName?: string }> = {};

    transactions.forEach(tx => {
      if (tx.status === 'CANCELED') return;
      tx.items.forEach(item => {
        if (item.status === 'CANCELED') return;
        if (!map[item.productId]) {
          map[item.productId] = { name: item.name, qty: 0, revenue: 0, categoryName: item.categoryName };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.quantity * item.sellPrice;
      });
    });

    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [transactions]);

  const maxQty = topProducts[0]?.qty || 1;

  const rankColors = ['#F6C90E', '#B0BEC5', '#CD7F32'];

  return (
    <View style={styles.container}>
      <Header title="Top Products" subtitle="All-Time Sales Rankings" onBack={() => router.back()} />
      {topProducts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="stats-chart-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Sales Data</Text>
          <Text style={styles.emptyDesc}>Complete some transactions to see rankings here.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={topProducts}
          keyExtractor={(_, i) => i.toString()}
          ListHeaderComponent={
            <View style={styles.podiumRow}>
              {topProducts.slice(0, 3).map((p, i) => (
                <View key={i} style={[styles.podiumItem, { flex: i === 0 ? 1.3 : 1 }]}>
                  <Ionicons
                    name="trophy"
                    size={i === 0 ? 28 : 20}
                    color={rankColors[i] ?? Colors.textMuted}
                  />
                  <Text style={styles.podiumName} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.podiumQty}>{p.qty} sold</Text>
                  <Text style={styles.podiumRev}>Rp {p.revenue.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          }
          renderItem={({ item, index }) => {
            const pct = (item.qty / maxQty) * 100;
            return (
              <View style={styles.row}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    {item.categoryName && (
                      <View style={styles.catBadge}>
                        <Text style={styles.catText}>{item.categoryName}</Text>
                      </View>
                    )}
                  </View>
                  {/* Progress bar */}
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.rowSub}>{item.qty} units sold</Text>
                </View>
                <Text style={styles.rowRev}>Rp {item.revenue.toLocaleString()}</Text>
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
  list: { padding: Spacing.lg, gap: Spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: Typography.lg, fontWeight: '700' },
  emptyDesc: { color: Colors.textMuted, fontSize: Typography.sm, textAlign: 'center' },

  // Podium
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
    alignItems: 'flex-end',
  },
  podiumItem: {
    alignItems: 'center',
    gap: 4,
    padding: Spacing.sm,
  },
  podiumName: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  podiumQty: { color: Colors.textSecondary, fontSize: 10 },
  podiumRev: { color: Colors.text, fontSize: 10, fontWeight: '700' },

  // Ranked list
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  rank: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    fontWeight: '800',
    width: 28,
    textAlign: 'center',
  },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowName: { color: Colors.text, fontSize: Typography.sm, fontWeight: '600', flex: 1 },
  catBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  catText: { color: Colors.primary, fontSize: 9, fontWeight: '700' },
  barBg: {
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  rowSub: { color: Colors.textMuted, fontSize: 10 },
  rowRev: { color: Colors.text, fontSize: Typography.sm, fontWeight: '700' },
});
