import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import PaymentSuccessView, {
  type PaymentSuccessData,
} from '../../../components/pos/PaymentSuccessView';
import { Colors } from '../../../components/ui';
import { useCartStore } from '../../../store/useCartStore';

export default function SuccessScreen() {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const {
    total = '0',
    paidAmount = '0',
    change = '0',
    itemsCount = '0',
    method = 'CASH',
    txId = '',
    timestamp = new Date().toISOString(),
    orderNote = '',
  } = useLocalSearchParams<{
    total?: string;
    paidAmount?: string;
    change?: string;
    itemsCount?: string;
    method?: string;
    txId?: string;
    timestamp?: string;
    orderNote?: string;
  }>();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const data: PaymentSuccessData = {
    txId: txId || 'unknown',
    timestamp,
    total: parseFloat(total),
    paidAmount: parseFloat(paidAmount || total),
    change: parseFloat(change),
    itemsCount: parseInt(itemsCount, 10) || 0,
    method,
    orderNote: orderNote || undefined,
  };

  return (
    <View style={styles.container}>
      <PaymentSuccessView
        data={data}
        onDone={() => router.replace('/pos')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
