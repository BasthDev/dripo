import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { usePosStore, Ingredient } from '../../../store/usePosStore';
import { buildDailyBuckets, computeTodayStats, formatRpShort } from '../../../utils/salesAnalytics';

type MenuItem = {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  path: string;
};

const analyticsItems: MenuItem[] = [
  {
    title: 'Visual Reports',
    desc: 'Revenue, profit & category charts with period filters',
    icon: 'analytics-outline',
    color: '#6C5CE7',
    path: '/reports/charts',
  },
  {
    title: 'Top Products',
    desc: 'Analyzing your best selling items',
    icon: 'stats-chart-outline',
    color: Colors.success,
    path: '/reports/top-products',
  },
];

const activityItems: MenuItem[] = [
  {
    title: 'Monthly Transactions',
    desc: 'View sales history and grouped by month',
    icon: 'receipt-outline',
    color: Colors.primary,
    path: '/reports/transactions',
  },
  {
    title: 'Inventory Activity',
    desc: 'Track every stock in and out movement',
    icon: 'swap-vertical-outline',
    color: Colors.secondary,
    path: '/reports/stock-flow',
  },
];

function MenuCard({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuDesc}>{item.desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ReportsIndex() {
  const router = useRouter();
  const { transactions, products, getRecipeCost } = usePosStore();

  const today = useMemo(
    () => computeTodayStats(transactions, products, getRecipeCost),
    [transactions, products, getRecipeCost]
  );

  const weekBuckets = useMemo(
    () => buildDailyBuckets(transactions, products, getRecipeCost, '7d'),
    [transactions, products, getRecipeCost]
  );

  const weekRevenue = weekBuckets.reduce((s, b) => s + b.revenue, 0);
  const weekProfit = weekBuckets.reduce((s, b) => s + b.profit, 0);
  const maxWeekRev = Math.max(...weekBuckets.map(b => b.revenue), 1);

  const lowStockItems = usePosStore(state => state.getLowStockIngredients)();
  const criticalCount = lowStockItems.filter((i: Ingredient) => i.stock <= 0).length;
  const lowCount = lowStockItems.length - criticalCount;
  const alertColor = criticalCount > 0 ? Colors.error : Colors.warning;

  return (
    <View style={styles.container}>
      <Header title="Business Analytics" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>ANALYTICS</Text>

        <TouchableOpacity
          style={styles.analyticsSummary}
          onPress={() => router.push('/reports/charts')}
          activeOpacity={0.85}
        >
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>Sales Overview</Text>
              <Text style={styles.summarySubtitle}>Today · tap for full charts</Text>
            </View>
            <View style={styles.summaryLink}>
              <Text style={styles.summaryLinkText}>Charts</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Revenue</Text>
              <Text style={styles.summaryStatValue}>Rp {today.revenue.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>COGS</Text>
              <Text style={[styles.summaryStatValue, { color: Colors.warning }]}>
                Rp {today.cogs.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Profit</Text>
              <Text style={[styles.summaryStatValue, { color: Colors.success }]}>
                Rp {today.profit.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Margin</Text>
              <Text style={styles.summaryStatValue}>{today.marginPct.toFixed(1)}%</Text>
              <Text style={styles.summaryStatSub}>{today.orders} orders today</Text>
            </View>
          </View>

          <View style={styles.weekBlock}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekLabel}>Last 7 days</Text>
              <Text style={styles.weekTotal}>
                Rp {weekRevenue.toLocaleString()} · +Rp {weekProfit.toLocaleString()} profit
              </Text>
            </View>
            <View style={styles.sparkRow}>
              {weekBuckets.map(b => {
                const h = Math.max((b.revenue / maxWeekRev) * 48, b.revenue > 0 ? 6 : 3);
                return (
                  <View key={b.dateKey} style={styles.sparkCol}>
                    <View style={[styles.sparkBar, { height: h }]} />
                    <Text style={styles.sparkLabel}>{b.label}</Text>
                  </View>
                );
              })}
            </View>
            {weekRevenue > 0 && (
              <Text style={styles.sparkHint}>
                Peak {formatRpShort(Math.max(...weekBuckets.map(b => b.revenue)))} ·{' '}
                {weekBuckets.reduce((s, b) => s + b.orders, 0)} orders
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {analyticsItems.map(item => (
          <MenuCard
            key={item.path}
            item={item}
            onPress={() => router.push(item.path as any)}
          />
        ))}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>ACTIVITY LOGS</Text>

        {activityItems.map(item => (
          <MenuCard
            key={item.path}
            item={item}
            onPress={() => router.push(item.path as any)}
          />
        ))}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>INVENTORY HEALTH</Text>

        <TouchableOpacity
          style={[styles.menuCard, lowStockItems.length > 0 && styles.menuCardAlert]}
          onPress={() => router.push('/reports/low-stock' as any)}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  (lowStockItems.length > 0 ? alertColor : Colors.success) + '15',
              },
            ]}
          >
            <Ionicons
              name={lowStockItems.length > 0 ? 'warning-outline' : 'checkmark-circle-outline'}
              size={24}
              color={lowStockItems.length > 0 ? alertColor : Colors.success}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.menuTitle}>Low Stock Alert</Text>
            <Text style={styles.menuDesc}>
              {lowStockItems.length === 0
                ? 'All ingredient levels are healthy'
                : [
                    criticalCount > 0 ? `${criticalCount} out of stock` : '',
                    lowCount > 0 ? `${lowCount} running low` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </Text>
          </View>
          {lowStockItems.length > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: alertColor }]}>
              <Text style={styles.alertBadgeText}>{lowStockItems.length}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  analyticsSummary: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '800' },
  summarySubtitle: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  summaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  summaryLinkText: { color: Colors.primary, fontSize: Typography.xs, fontWeight: '700' },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryStat: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 2,
  },
  summaryStatLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryStatValue: { color: Colors.text, fontSize: Typography.sm, fontWeight: '800' },
  summaryStatSub: { color: Colors.textMuted, fontSize: 9 },
  weekBlock: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekLabel: { color: Colors.textSecondary, fontSize: Typography.xs, fontWeight: '700' },
  weekTotal: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', flex: 1, textAlign: 'right' },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 64,
    gap: 4,
  },
  sparkCol: { flex: 1, alignItems: 'center', gap: 4 },
  sparkBar: {
    width: '100%',
    maxWidth: 28,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 3,
  },
  sparkLabel: { color: Colors.textMuted, fontSize: 8, fontWeight: '600' },
  sparkHint: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  menuCardAlert: {
    borderColor: Colors.warning + '60',
    backgroundColor: Colors.warning + '08',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: { flex: 1 },
  menuTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '700' },
  menuDesc: { color: Colors.textSecondary, fontSize: Typography.xs, marginTop: 2 },
  alertBadge: {
    borderRadius: 99,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  alertBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
});
