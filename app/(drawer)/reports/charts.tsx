import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChartView, DonutChart, LineAreaChart } from '../../../components/charts';
import { Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import {
  buildCategoryBreakdown,
  buildDailyBuckets,
  formatRpShort,
  PeriodKey,
} from '../../../utils/salesAnalytics';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
];

export default function ChartsReportScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>('7d');
  const { transactions, products, categories, getRecipeCost } = usePosStore();

  const buckets = useMemo(
    () => buildDailyBuckets(transactions, products, getRecipeCost, period),
    [transactions, products, getRecipeCost, period]
  );

  const periodTxs = useMemo(() => {
    const from = buckets[0]?.dateKey;
    if (!from) return [];
    return transactions.filter((t) => t.timestamp >= from && t.status !== 'CANCELED');
  }, [transactions, buckets]);

  const categorySlices = useMemo(
    () => buildCategoryBreakdown(periodTxs, categories),
    [periodTxs, categories]
  );

  const totals = useMemo(() => {
    const revenue = buckets.reduce((s, b) => s + b.revenue, 0);
    const cogs = buckets.reduce((s, b) => s + b.cogs, 0);
    const profit = revenue - cogs;
    const orders = buckets.reduce((s, b) => s + b.orders, 0);
    return {
      revenue,
      cogs,
      profit,
      orders,
      marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  }, [buckets]);

  const scrollable = period === '30d' || period === '90d';
  const columnWidth = period === '90d' ? 36 : 44;
  const columnGap = period === '90d' ? 10 : 14;
  const pointSpacing = period === '90d' ? 40 : 48;

  const barData = buckets.map((b) => ({
    label: b.label,
    value: b.revenue,
    color: Colors.primary,
  }));

  const lineData = buckets.map((b) => ({
    label: b.label,
    value: Math.max(b.profit, 0),
  }));

  const donutData = categorySlices.map((s) => ({
    value: s.value,
    color: s.color,
  }));

  const hasSales = totals.revenue > 0;

  return (
    <View style={styles.container}>
      <Header
        title="Visual Reports"
        subtitle="Revenue, COGS & category trends"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodChip, period === p.key && styles.periodChipActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Revenue</Text>
            <Text style={styles.summaryValue}>Rp {totals.revenue.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>COGS</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              Rp {totals.cogs.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Profit</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              Rp {totals.profit.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Margin</Text>
            <Text style={styles.summaryValue}>{totals.marginPct.toFixed(1)}%</Text>
            <Text style={styles.summarySub}>{totals.orders} orders</Text>
          </View>
        </View>

        {!hasSales ? (
          <View style={styles.empty}>
            <Ionicons name="analytics-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No sales in this period</Text>
            <Text style={styles.emptyDesc}>
              Complete transactions to see revenue and profit charts here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="bar-chart" size={20} color={Colors.primary} />
                <Text style={styles.chartTitle}>Daily Revenue</Text>
              </View>
              {scrollable && (
                <Text style={styles.scrollHint}>Swipe horizontally to see all dates</Text>
              )}
              <BarChartView
                data={barData}
                height={220}
                formatValue={formatRpShort}
                scrollable={scrollable}
                columnWidth={columnWidth}
                columnGap={columnGap}
              />
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="trending-up" size={20} color={Colors.success} />
                <Text style={styles.chartTitle}>Daily Profit</Text>
              </View>
              {scrollable && (
                <Text style={styles.scrollHint}>Swipe horizontally to see all dates</Text>
              )}
              <LineAreaChart
                data={lineData}
                height={220}
                color={Colors.success}
                formatValue={formatRpShort}
                scrollable={scrollable}
                pointSpacing={pointSpacing}
              />
            </View>

            {categorySlices.length > 0 && (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="pie-chart" size={20} color={Colors.secondary} />
                  <Text style={styles.chartTitle}>Sales by Category</Text>
                </View>
                <View style={styles.pieRow}>
                  <DonutChart
                    data={donutData}
                    size={180}
                    centerLabel="Total"
                    centerValue={formatRpShort(totals.revenue)}
                  />
                  <View style={styles.legend}>
                    {categorySlices.map((s) => (
                      <View key={s.name} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                        <Text style={styles.legendName} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text style={styles.legendVal}>Rp {s.value.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  periodRow: { flexDirection: 'row', gap: Spacing.sm },
  periodChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '700' },
  periodTextActive: { color: Colors.white },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: { color: Colors.text, fontSize: Typography.md, fontWeight: '800' },
  summarySub: { color: Colors.textMuted, fontSize: Typography.xs },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chartTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '800' },
  scrollHint: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    marginBottom: Spacing.sm,
  },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  legend: { flex: 1, gap: Spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, color: Colors.text, fontSize: Typography.xs, fontWeight: '600' },
  legendVal: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyTitle: { color: Colors.text, fontSize: Typography.lg, fontWeight: '700' },
  emptyDesc: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
