import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Colors, EmptyStateCard, FlatListCard, Header, Spacing } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';

export default function ExpensesScreen() {
  const router = useRouter();
  const expenses = usePosStore(s => s.expenses);

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [expenses]
  );

  const total = sorted.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <View style={styles.container}>
      <Header title="Inventory Expenses" onBack={() => router.back()} />
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="wallet-outline"
            title="No Expenses"
            description="Enable “Record as expense” when receiving stock to track purchases here."
          />
        </View>
      ) : (
        <>
          <View style={styles.totalBar}>
            <FlatListCard
              title="Total recorded"
              subtitle={`${sorted.length} entries`}
              trailingValue={`Rp ${total.toLocaleString()}`}
              leftIcon="calculator-outline"
              leftIconColor={Colors.error}
            />
          </View>
          <FlatList
            contentContainerStyle={styles.list}
            data={sorted}
            keyExtractor={e => e.id}
            renderItem={({ item }) => {
              const d = new Date(item.timestamp);
              return (
                <FlatListCard
                  title={item.ingredientName}
                  subtitle={`${item.quantity} × Rp ${item.unitCost.toLocaleString()} · ${d.toLocaleDateString()}`}
                  trailingValue={`Rp ${item.totalAmount.toLocaleString()}`}
                  leftIcon="receipt-outline"
                  leftIconColor={Colors.secondary}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  totalBar: { padding: Spacing.lg, paddingBottom: 0 },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
});
