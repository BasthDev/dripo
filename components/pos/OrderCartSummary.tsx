import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CartItem, getCartLineUnitPrice } from '../../store/useCartStore';
import type { ProductModifier } from '../../store/usePosStore';
import { Colors, Spacing, Typography } from '../ui';

type Props = {
  items: CartItem[];
  modifiers: ProductModifier[];
  total: number;
  title?: string;
  style?: ViewStyle;
};

export default function OrderCartSummary({
  items,
  modifiers,
  total,
  title = 'Order Summary',
  style,
}: Props) {
  const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <View style={[styles.cartContainer, style]}>
      <View style={styles.cartHeader}>
        <View style={styles.cartHeaderLeft}>
          <Ionicons name="cart-outline" size={22} color={Colors.text} />
          <Text style={styles.cartTitle}>{title}</Text>
        </View>
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>{itemsCount}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.cartItemId}
        contentContainerStyle={styles.cartList}
        renderItem={({ item }) => {
          const unitPrice = getCartLineUnitPrice(item);
          return (
            <View style={styles.cartItem}>
              <View style={styles.cartItemLeft}>
                <Text style={styles.cartItemName} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <Text style={styles.cartItemDetails}>
                  {item.quantity} x Rp {unitPrice.toLocaleString()}
                </Text>
                {item.modifierIds?.length ? (
                  <Text style={styles.cartItemNote} numberOfLines={2}>
                    {item.modifierIds
                      .map(id => modifiers.find(m => m.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                ) : null}
                {item.note ? (
                  <Text style={styles.cartItemNote} numberOfLines={2}>
                    Note: {item.note}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.cartItemTotal}>
                Rp {(unitPrice * item.quantity).toLocaleString()}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyCartContainer}>
            <Ionicons name="basket-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No items in cart</Text>
          </View>
        )}
      />

      <View style={styles.cartTotalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalRowLabel}>Subtotal</Text>
          <Text style={styles.totalRowVal}>Rp {total.toLocaleString()}</Text>
        </View>
        <View style={[styles.totalRow, { marginTop: Spacing.sm }]}>
          <Text style={[styles.totalRowLabel, styles.totalDueLabel]}>Total Due</Text>
          <Text style={styles.totalDueVal}>Rp {total.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cartTitle: {
    padding: Spacing.xs + 1.5,
    color: Colors.text,
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  cartBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 99,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  cartList: {
    padding: Spacing.lg,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  cartItemLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  cartItemName: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '600',
  },
  cartItemDetails: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    marginTop: 2,
  },
  cartItemNote: {
    color: Colors.primary,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cartItemTotal: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '700',
  },
  emptyCartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.md,
    fontWeight: '600',
  },
  cartTotalSection: {
    padding: Spacing.sm + 4,
    backgroundColor: Colors.surface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  totalDueLabel: {
    fontWeight: '700',
    color: Colors.text,
  },
  totalRowVal: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '600',
  },
  totalDueVal: {
    color: Colors.success,
    fontSize: Typography.xl,
    fontWeight: '800',
  },
});
