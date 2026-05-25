import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Colors, EmptyStateCard, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';

export default function TransactionsMonthScreen() {
  const router = useRouter();
  const { month } = useLocalSearchParams<{ month: string }>();
  const transactions = usePosStore(state => state.transactions);

  const filtered = transactions
    .filter(tx => tx.timestamp.startsWith(month))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const dateObj = new Date(`${month}-01T00:00:00Z`);
  const monthName = dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <Header title={monthName} subtitle="Sales List" onBack={() => router.back()} />
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="receipt-outline"
            title="No Data"
            description="No transactions for this month."
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={tx => tx.id}
          renderItem={({ item }) => {
            const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const day = new Date(item.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' });
            const isCanceled = item.status === 'CANCELED';
            return (
              <View style={[styles.row, isCanceled && styles.rowCanceled]}>
                {/* Left Icon */}
                <View style={[styles.iconBox, { backgroundColor: isCanceled ? Colors.error + '15' : Colors.primary + '15' }]}>
                  <Ionicons
                    name={isCanceled ? 'close-circle-outline' : 'receipt-outline'}
                    size={20}
                    color={isCanceled ? Colors.error : Colors.primary}
                  />
                </View>

                {/* Content */}
                <View style={styles.rowContent}
                  onTouchEnd={() => router.push({ pathname: '/reports/transactions-detail', params: { id: item.id } })}
                >
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowTitle, isCanceled && styles.textMuted]}>
                      Tx: {item.id.substring(0, 6)}
                    </Text>
                    {isCanceled && (
                      <View style={styles.voidBadge}>
                        <Text style={styles.voidBadgeText}>VOID</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rowSub}>{day} at {time} • {item.paymentMethod}</Text>
                </View>

                {/* Value + Chevron */}
                <View style={styles.trailingBox}
                  onTouchEnd={() => router.push({ pathname: '/reports/transactions-detail', params: { id: item.id } })}
                >
                  <Text style={[styles.rowValue, isCanceled && styles.textMuted]}>
                    Rp {item.totalAmount.toLocaleString()}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },

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
  rowCanceled: {
    opacity: 0.75,
    borderColor: Colors.error + '40',
    backgroundColor: Colors.error + '08',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  rowTitle: { color: Colors.text, fontSize: Typography.sm, fontWeight: '600', textTransform: 'uppercase', minWidth: 60 },
  rowSub: { color: Colors.textMuted, fontSize: 11 },
  trailingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { color: Colors.text, fontSize: Typography.sm, fontWeight: '700' },
  textMuted: { color: Colors.textMuted },

  voidBadge: {
    backgroundColor: Colors.error + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    // marginLeft: 10,
  },
  voidBadgeText: { color: Colors.error, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  separator: { height: Spacing.sm },
});
