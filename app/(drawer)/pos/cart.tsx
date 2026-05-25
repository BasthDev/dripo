import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, Colors } from '../../../components/ui';
import CartPanel from '../../../components/pos/CartPanel';

export default function MobileCartScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header title="Order Cart" onBack={() => router.back()} />
      <View style={styles.content}>
        <CartPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
});
