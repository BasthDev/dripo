import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Colors, Spacing, Typography, Radius } from '../../../components/ui';
import { useCartStore } from '../../../store/useCartStore';

export default function SuccessScreen() {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { total = '0', change = '0', itemsCount = '0', method = 'CASH' } = useLocalSearchParams<{ total?: string, change?: string, itemsCount?: string, method?: string }>();

  useEffect(() => {
    // Clear cart data when landing on success page
    clearCart();
  }, [clearCart]);

  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Ionicons name="checkmark" size={60} color={Colors.white} />
      </View>
      
      <Text style={styles.title}>Payment Successful</Text>
      <Text style={styles.subtitle}>Order has been recorded successfully.</Text>
      
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Total Amount</Text>
            <Text style={styles.gridValue}>Rp {parseFloat(total).toLocaleString()}</Text>
          </View>
          <View style={styles.gridItemRight}>
            <Text style={styles.gridLabel}>Change</Text>
            <Text style={styles.gridValue}>Rp {parseFloat(change).toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Total Items</Text>
            <Text style={styles.gridValue}>{itemsCount} items</Text>
          </View>
          <View style={styles.gridItemRight}>
            <Text style={styles.gridLabel}>Payment Type</Text>
            <Text style={styles.gridValue}>{method}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actionGroup}>
        <Button 
          label="New Order" 
          variant="primary" 
          iconLeft="add-circle-outline"
          onPress={() => router.replace('/pos')}
          style={styles.btn}
        />
        <Button 
          label="Back to Dashboard" 
          variant="outline" 
          onPress={() => router.replace('/(drawer)')}
          style={styles.btn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.xxl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
    textAlign: 'center',
    marginBottom: 50, 
  },
  gridContainer: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.lg,
    marginBottom: Spacing.xxxl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  gridItemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  gridLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    marginBottom: 4,
  },
  gridValue: {
    color: Colors.text,
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  actionGroup: {
    width: '100%',
    gap: Spacing.md,
  },
  btn: {
    width: '100%',
  },
});
