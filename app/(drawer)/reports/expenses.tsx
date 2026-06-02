import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Colors,
  EmptyStateCard,
  FlatListCard,
  Header,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../../components/ui';
import { useDeviceLayout } from '../../../hooks/useDeviceLayout';
import { usePosStore } from '../../../store/usePosStore';
import { formatRp } from '../../../utils/formatCurrency';
import {
  filterExpensesByTab,
  summarizeExpenses,
} from '../../../utils/expenseAnalytics';
import { OPERATING_EXPENSE_LABELS } from '../../../utils/inventoryLabels';

type Tab = 'ALL' | 'INVENTORY' | 'OPERATING';

function StatChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.statChipLabel}>{label}</Text>
      <Text style={styles.statChipValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ExpenseReportCard({
  summary,
  tab,
  isTablet,
}: {
  summary: ReturnType<typeof summarizeExpenses>;
  tab: Tab;
  isTablet: boolean;
}) {
  const tabTotal =
    tab === 'INVENTORY'
      ? summary.inventoryTotal
      : tab === 'OPERATING'
        ? summary.operatingTotal
        : summary.total;

  const operatingPct = summary.total > 0 ? 100 - summary.inventoryPct : 0;

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.reportEyebrow}>Expense overview</Text>
          <Text style={styles.reportTotal}>{formatRp(tabTotal)}</Text>
          <Text style={styles.reportSub}>
            {tab === 'ALL'
              ? `${summary.count} entries all time`
              : tab === 'INVENTORY'
                ? `${summary.inventoryCount} inventory purchases`
                : `${summary.operatingCount} operating entries`}
          </Text>
        </View>
        <View style={styles.reportIconWrap}>
          <Ionicons name="wallet-outline" size={28} color={Colors.primary} />
        </View>
      </View>

      <View style={[styles.statRow, isTablet && styles.statRowTablet]}>
        <StatChip
          label="This month"
          value={formatRp(summary.monthTotal)}
          icon="calendar-outline"
        />
        <StatChip
          label="Avg / entry"
          value={formatRp(summary.avgAmount)}
          icon="stats-chart-outline"
        />
        <StatChip
          label="This month #"
          value={`${summary.monthCount}`}
          icon="layers-outline"
        />
      </View>

      {summary.total > 0 ? (
        <View style={styles.breakdownBox}>
          <Text style={styles.breakdownTitle}>Spend mix</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barSegmentInventory,
                { flex: summary.inventoryPct || 0.001 },
              ]}
            />
            <View
              style={[
                styles.barSegmentOperating,
                { flex: operatingPct || 0.001 },
              ]}
            />
          </View>
          <View style={styles.barLegend}>
            <View style={styles.barLegendItem}>
              <View style={[styles.barDot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.barLegendText}>
                COGS {summary.inventoryPct.toFixed(0)}% · {formatRp(summary.inventoryTotal)}
              </Text>
            </View>
            <View style={styles.barLegendItem}>
              <View style={[styles.barDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.barLegendText}>
                Operating {operatingPct.toFixed(0)}% · {formatRp(summary.operatingTotal)}
              </Text>
            </View>
          </View>
          {summary.topOperatingType ? (
            <Text style={styles.topType}>
              Top operating: {summary.topOperatingType.label} ({formatRp(summary.topOperatingType.amount)})
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { isTablet } = useDeviceLayout();
  const expenses = usePosStore(s => s.expenses);
  const [tab, setTab] = useState<Tab>('ALL');

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [expenses]
  );

  const summary = useMemo(() => summarizeExpenses(sorted), [sorted]);

  const filtered = useMemo(
    () => filterExpensesByTab(sorted, tab),
    [sorted, tab]
  );

  const ListHeader = (
    <>
      <ExpenseReportCard summary={summary} tab={tab} isTablet={isTablet} />
      <View style={styles.categoryCards}>
        <View style={[styles.categoryCard, isTablet && styles.categoryCardHalf]}>
          <Ionicons name="cube-outline" size={20} color={Colors.secondary} />
          <Text style={styles.categoryCardLabel}>Inventory (COGS)</Text>
          <Text style={styles.categoryCardValue}>{formatRp(summary.inventoryTotal)}</Text>
          <Text style={styles.categoryCardMeta}>{summary.inventoryCount} entries</Text>
        </View>
        <View style={[styles.categoryCard, isTablet && styles.categoryCardHalf]}>
          <Ionicons name="briefcase-outline" size={20} color={Colors.primary} />
          <Text style={styles.categoryCardLabel}>Operating</Text>
          <Text style={styles.categoryCardValue}>{formatRp(summary.operatingTotal)}</Text>
          <Text style={styles.categoryCardMeta}>{summary.operatingCount} entries</Text>
        </View>
      </View>
      <Text style={styles.listSectionTitle}>
        {tab === 'ALL' ? 'All expenses' : tab === 'INVENTORY' ? 'Inventory' : 'Operating'}
      </Text>
    </>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Expenses"
        onBack={() => router.back()}
        actions={[
          {
            icon: 'add',
            onPress: () => router.push('/procurement/operating-expense'),
          },
        ]}
      />

      <View style={styles.tabs}>
        {(['ALL', 'INVENTORY', 'OPERATING'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'ALL' ? 'All' : t === 'INVENTORY' ? 'COGS' : 'Operating'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sorted.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll}>
          <ExpenseReportCard summary={summary} tab={tab} isTablet={isTablet} />
          <EmptyStateCard
            icon="wallet-outline"
            title="No Expenses"
            description="Inventory COGS from Stock In, or add operating costs (rent, salary, etc.)."
            actionLabel="Add operating expense"
            onAction={() => router.push('/procurement/operating-expense')}
          />
        </ScrollView>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={e => e.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => {
            const d = new Date(item.timestamp);
            const title =
              item.title ??
              item.documentNo ??
              (item.ingredientName
                ? `${item.ingredientName} purchase`
                : 'Expense');
            const typeLabel =
              item.operatingType != null
                ? OPERATING_EXPENSE_LABELS[item.operatingType]
                : null;
            const subtitle = [
              item.category === 'INVENTORY' ? 'Inventory COGS' : 'Operating',
              typeLabel,
              item.supplierName,
              d.toLocaleDateString(),
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <FlatListCard
                title={title}
                subtitle={subtitle}
                trailingValue={formatRp(item.totalAmount)}
                leftIcon={
                  item.category === 'INVENTORY' ? 'receipt-outline' : 'card-outline'
                }
                leftIconColor={
                  item.category === 'INVENTORY' ? Colors.secondary : Colors.primary
                }
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={
            <Text style={styles.emptyTab}>No expenses in this category.</Text>
          }
        />
      )}
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
    borderRadius: Radius.sm,
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
  list: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.sm },
  emptyScroll: {
    padding: Spacing.lg,
    flexGrow: 1,
    gap: Spacing.lg,
  },
  emptyTab: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportEyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reportTotal: {
    color: Colors.text,
    fontSize: Typography.xxxl,
    fontWeight: '800',
    marginTop: 4,
  },
  reportSub: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    marginTop: 2,
  },
  reportIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  statRowTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statChip: {
    flex: 1,
    minWidth: 100,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statChipLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statChipValue: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '800',
  },
  breakdownBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  breakdownTitle: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  barTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  barSegmentInventory: {
    backgroundColor: Colors.secondary,
  },
  barSegmentOperating: {
    backgroundColor: Colors.primary,
  },
  barLegend: { gap: 6 },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barDot: { width: 8, height: 8, borderRadius: 4 },
  barLegendText: { color: Colors.textSecondary, fontSize: 11, flex: 1 },
  topType: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  categoryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
    ...Shadow.sm,
  },
  categoryCardHalf: {
    flexBasis: '48%',
  },
  categoryCardLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  categoryCardValue: {
    color: Colors.text,
    fontSize: Typography.lg,
    fontWeight: '800',
  },
  categoryCardMeta: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  listSectionTitle: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
});
