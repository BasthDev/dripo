import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Header, Radius, Spacing, Typography } from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';
import { computeTodayStats } from '../../utils/salesAnalytics';

export default function DashboardScreen() {
  const router = useRouter();
  const { ingredients, products, transactions, getRecipeCost } = usePosStore();

  const today = useMemo(
    () => computeTodayStats(transactions, products, getRecipeCost),
    [transactions, products, getRecipeCost]
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTxs = transactions.filter(
    t => t.timestamp.startsWith(todayStr) && t.status !== 'CANCELED'
  );

  const productSalesMap: Record<string, { name: string; qty: number; revenue: number; cogs: number }> = {};
  todayTxs.forEach(tx => {
    tx.items.forEach(item => {
      if (item.status === 'CANCELED') return;
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.name, qty: 0, revenue: 0, cogs: 0 };
      }
      const unitCost =
        item.cost !== undefined && item.cost > 0
          ? item.cost
          : (() => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return 0;
              if (product.useHpp && product.hppId) return getRecipeCost(product.hppId);
              return product.buyPrice || 0;
            })();
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.quantity * item.sellPrice;
      productSalesMap[item.productId].cogs += unitCost * item.quantity;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const lowStockIngredients = ingredients.filter(i => {
    const threshold = i.lowStockThreshold ?? (i.type === 'QUANTITY' ? 10 : 500);
    return i.stock < threshold;
  });

  return (
    <View style={styles.container}>
      <Header title="Dashboard" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroTitle}>Today's Performance</Text>
              <Text style={styles.heroDate}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroChartBtn}
              onPress={() => router.push('/reports/charts')}
            >
              <Ionicons name="analytics-outline" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroMainRow}>
            <View style={styles.heroMainStat}>
              <Text style={styles.heroMainLabel}>Net Revenue</Text>
              <Text style={styles.heroMainValue}>Rp {today.revenue.toLocaleString()}</Text>
            </View>
            <View style={styles.heroMainDivider} />
            <View style={styles.heroMainStat}>
              <Text style={styles.heroMainLabel}>Gross Profit</Text>
              <Text style={[styles.heroMainValue, { color: '#C8F0CA' }]}>
                Rp {today.profit.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.heroDetailGrid}>
            <View style={styles.heroDetailItem}>
              <Ionicons name="cube-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDetailLabel}>COGS</Text>
              <Text style={styles.heroDetailValue}>Rp {today.cogs.toLocaleString()}</Text>
            </View>
            <View style={styles.heroDetailItem}>
              <Ionicons name="pricetag-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDetailLabel}>Products Sold</Text>
              <Text style={styles.heroDetailValue}>{today.itemsSold} units</Text>
            </View>
            <View style={styles.heroDetailItem}>
              <Ionicons name="pie-chart-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDetailLabel}>Margin</Text>
              <Text style={styles.heroDetailValue}>{today.marginPct.toFixed(1)}%</Text>
            </View>
            <View style={styles.heroDetailItem}>
              <Ionicons name="receipt-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDetailLabel}>Avg Order</Text>
              <Text style={styles.heroDetailValue}>
                Rp {Math.round(today.avgOrder).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
            <Text style={styles.metricVal}>{today.orders}</Text>
            <Text style={styles.metricLab}>Orders</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="warning-outline" size={24} color={Colors.error} />
            <Text style={styles.metricVal}>{lowStockIngredients.length}</Text>
            <Text style={styles.metricLab}>Low Stock</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="trending-up-outline" size={24} color={Colors.success} />
            <Text style={styles.metricVal}>{today.marginPct.toFixed(0)}%</Text>
            <Text style={styles.metricLab}>Margin</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Selling Today</Text>
          <TouchableOpacity onPress={() => router.push('/reports/top-products')}>
            <Text style={styles.sectionLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.productSalesCard}>
          {topProducts.length === 0 ? (
            <Text style={styles.emptyText}>No sales yet today.</Text>
          ) : (
            topProducts.map((p, i) => {
              const itemProfit = p.revenue - p.cogs;
              const itemMargin = p.revenue > 0 ? (itemProfit / p.revenue) * 100 : 0;
              return (
                <View
                  key={i}
                  style={[styles.productRow, i === topProducts.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.productInfo}>
                    <Text style={styles.productBadge}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.productCogs}>
                        COGS Rp {p.cogs.toLocaleString()} · Margin {itemMargin.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.productQty}>{p.qty} sold</Text>
                    <Text style={styles.productRev}>Rp {p.revenue.toLocaleString()}</Text>
                    <Text style={styles.productProfit}>+Rp {itemProfit.toLocaleString()}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.actionContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/pos')}>
              <Ionicons name="cart-outline" size={22} color={Colors.primary} />
              <Text style={styles.actionText}>New Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/procurement/stock-opname')}
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.actionText}>Stock Opname</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/reports/charts')}>
              <Ionicons name="analytics-outline" size={22} color={Colors.primary} />
              <Text style={styles.actionText}>Charts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={22} color={Colors.primary} />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg },

  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    gap: Spacing.lg,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroDate: { color: '#FFF', fontSize: Typography.md, marginTop: 4, opacity: 0.9 },
  heroChartBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  heroMainStat: { flex: 1 },
  heroMainLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', marginBottom: 4 },
  heroMainValue: { color: '#FFF', fontSize: Typography.xxl, fontWeight: '800' },
  heroMainDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  heroDetailItem: {
    width: '47%',
    flexGrow: 1,
    gap: 2,
  },
  heroDetailLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '600' },
  heroDetailValue: { color: '#FFF', fontSize: Typography.sm, fontWeight: '700' },

  metricsGrid: { flexDirection: 'row', gap: Spacing.md },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  metricVal: { color: Colors.text, fontSize: Typography.lg, fontWeight: '800' },
  metricLab: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  sectionTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '800' },
  sectionLink: { color: Colors.primaryLight, fontSize: Typography.sm, fontWeight: '600' },

  productSalesCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  productBadge: {
    backgroundColor: Colors.surfaceElevated,
    color: Colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  productName: { color: Colors.text, fontSize: Typography.md, fontWeight: '600' },
  productCogs: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  productQty: { color: Colors.textSecondary, fontSize: Typography.xs, fontWeight: '700' },
  productRev: { color: Colors.text, fontSize: Typography.sm, fontWeight: '700', marginTop: 2 },
  productProfit: { color: Colors.success, fontSize: 10, fontWeight: '700', marginTop: 2 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.md },

  actionContainer: { gap: Spacing.md },
  actionRow: { flexDirection: 'row', gap: Spacing.md },
  actionItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  actionText: { color: Colors.text, fontSize: Typography.xs, fontWeight: '700' },
});
