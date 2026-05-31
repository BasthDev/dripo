import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header, Colors } from '../../../components/ui';
import CartPanel from '../../../components/pos/CartPanel';
import type { TableOrderNavFrom } from '../../../utils/tableOrderFlow';

export default function MobileCartScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string; tableId?: string }>();
  const navFrom: TableOrderNavFrom = from === 'orders' ? 'orders' : 'pos';

  return (
    <View style={styles.container}>
      <Header title="Order Cart" onBack={() => router.back()} />
      <View style={styles.content}>
        <CartPanel navFrom={navFrom} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
});
