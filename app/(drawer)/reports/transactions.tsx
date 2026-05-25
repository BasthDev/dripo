import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, FlatListCard, EmptyStateCard, Colors, Spacing } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';

export default function TransactionsGroupScreen() {
  const router = useRouter();
  const transactions = usePosStore(state => state.transactions);

  // Group by YYYY-MM
  const groups: Record<string, { count: number; voided: number; total: number }> = {};
  transactions.forEach(tx => {
    const month = tx.timestamp.substring(0, 7);
    if (!groups[month]) groups[month] = { count: 0, voided: 0, total: 0 };
    groups[month].count += 1;
    if (tx.status === 'CANCELED') {
      groups[month].voided += 1;
    } else {
      groups[month].total += tx.totalAmount;
    }
  });

  const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <View style={styles.container}>
      <Header title="Transaction History" subtitle="Grouped by Month" onBack={() => router.back()} />
      {sortedMonths.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="receipt-outline"
            title="No Transactions"
            description="You haven't recorded any sales yet."
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={sortedMonths}
          keyExtractor={m => m}
          renderItem={({ item }) => {
            const dateObj = new Date(`${item}-01T00:00:00Z`);
            const monthName = dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            return (
              <FlatListCard
                title={monthName}
                subtitle={`${groups[item].count} orders${groups[item].voided > 0 ? ` • ${groups[item].voided} voided` : ''}`}
                trailingValue={`Rp ${groups[item].total.toLocaleString()}`}
                leftIcon="calendar-outline"
                leftIconColor={Colors.secondary}
                onPress={() => router.push({ pathname: '/reports/transactions-month', params: { month: item } })}
              />
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
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
});
