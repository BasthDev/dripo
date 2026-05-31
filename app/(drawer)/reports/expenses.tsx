import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, EmptyStateCard, FlatListCard, Header, Spacing } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import { OPERATING_EXPENSE_LABELS } from '../../../utils/inventoryLabels';

type Tab = 'ALL' | 'INVENTORY' | 'OPERATING';

export default function ExpensesScreen() {
  const router = useRouter();
  const expenses = usePosStore(s => s.expenses);
  const [tab, setTab] = useState<Tab>('ALL');

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [expenses]
  );

  const filtered = useMemo(() => {
    if (tab === 'ALL') return sorted;
    return sorted.filter(e => e.category === tab);
  }, [sorted, tab]);

  const inventoryTotal = sorted
    .filter(e => e.category === 'INVENTORY')
    .reduce((s, e) => s + e.totalAmount, 0);

  const operatingTotal = sorted
    .filter(e => e.category === 'OPERATING')
    .reduce((s, e) => s + e.totalAmount, 0);

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
        <View style={styles.empty}>
          <EmptyStateCard
            icon="wallet-outline"
            title="No Expenses"
            description="Inventory COGS from Stock In, or add operating costs (rent, salary, etc.)."
            actionLabel="Add operating expense"
            onAction={() => router.push('/procurement/operating-expense')}
          />
        </View>
      ) : (
        <>
          <View style={styles.totalBar}>
            <FlatListCard
              title="Inventory purchases (COGS)"
              subtitle={`${sorted.filter(e => e.category === 'INVENTORY').length} entries`}
              trailingValue={`Rp ${inventoryTotal.toLocaleString()}`}
              leftIcon="cube-outline"
              leftIconColor={Colors.error}
            />
            <View style={{ height: Spacing.sm }} />
            <FlatListCard
              title="Operating expenses"
              subtitle={`${sorted.filter(e => e.category === 'OPERATING').length} entries`}
              trailingValue={`Rp ${operatingTotal.toLocaleString()}`}
              leftIcon="briefcase-outline"
              leftIconColor={Colors.secondary}
            />
          </View>
          <FlatList
            contentContainerStyle={styles.list}
            data={filtered}
            keyExtractor={e => e.id}
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
                  trailingValue={`Rp ${item.totalAmount.toLocaleString()}`}
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
        </>
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
    borderRadius: 8,
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
  totalBar: { padding: Spacing.lg, paddingBottom: 0 },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  emptyTab: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
