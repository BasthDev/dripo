import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header, Colors } from '../../../components/ui';
import CartPanel from '../../../components/pos/CartPanel';
import type { TableOrderNavFrom, TableSaleMode } from '../../../utils/tableOrderFlow';

export default function MobileCartScreen() {
  const router = useRouter();
  const { from, mode } = useLocalSearchParams<{ from?: string; tableId?: string; mode?: string }>();
  const navFrom: TableOrderNavFrom = from === 'orders' ? 'orders' : 'pos';
  const tableSaleMode: TableSaleMode | undefined =
    mode === 'add' || mode === 'edit' ? mode : undefined;

  return (
    <View style={styles.container}>
      <Header title="Order Cart" onBack={() => router.back()} />
      <View style={styles.content}>
        <CartPanel navFrom={navFrom} tableSaleMode={tableSaleMode} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
});
