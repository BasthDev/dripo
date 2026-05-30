import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import uuid from 'react-native-uuid';
import PaymentSuccessView, {
  type PaymentSuccessData,
} from '../../../components/pos/PaymentSuccessView';
import {
  Button,
  Colors,
  Header,
  InputField,
  Radius,
  Spacing,
  Typography,
} from '../../../components/ui';
import { getCartLineUnitPrice, useCartStore } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';
import { printReceipt } from '../../../utils/bluetoothPrinter';
import {
  computeModifierAwareCost,
  getAppliedModifierLabels,
  getModifierPriceDelta,
  mergeRecipeLines,
  recipeIngredientsToLines,
} from '../../../utils/modifierUtils';

type PaymentMethod = 'CASH' | 'QRIS' | 'CARD';

export default function PaymentScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const { getTotal, clearCart, items, orderNote, setOrderNote, refreshFromStore } =
    useCartStore();

  useEffect(() => {
    refreshFromStore();
  }, [refreshFromStore]);

  const { addTransaction, getRecipeCost, recipes, modifiers } = usePosStore();

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [localOrderNote, setLocalOrderNote] = useState(orderNote);

  const [isPaid, setIsPaid] = useState(false);

  const [successData, setSuccessData] = useState<PaymentSuccessData | null>(null);

  const total = getTotal();
  const cashParsed = parseFloat(cashGiven) || 0;
  const change = Math.max(0, cashParsed - total);

  const canPay = method !== 'CASH' || cashParsed >= total;

  const isLandscape = width > height;
  const isTablet = width >= 768;
  const showSplit = isLandscape || isTablet;

  const handleConfirm = async () => {
    if (!canPay) return;

    const txId = uuid.v4() as string;
    const timestamp = new Date().toISOString();

    const { modifiers, ingredients } = usePosStore.getState();

    const txItems = items.map(cartItem => {
      let cost = 0;
      let hppId: string | undefined;
      let recipeSnapshot: { ingredientId: string; quantity: number }[] | undefined;
      const modifierIds = cartItem.modifierIds ?? [];
      const unitSell =
        cartItem.product.sellPrice +
        getModifierPriceDelta(modifierIds, modifiers);

      if (cartItem.product.useHpp && cartItem.product.hppId) {
        hppId = cartItem.product.hppId;
        const baseCost = getRecipeCost(hppId) || 0;
        cost = computeModifierAwareCost(baseCost, modifierIds, modifiers, ingredients);
        const recipe = recipes.find(r => r.id === hppId);
        if (recipe) {
          recipeSnapshot = mergeRecipeLines(
            recipeIngredientsToLines(recipe.ingredients),
            modifierIds,
            modifiers
          );
        }
      } else if (!cartItem.product.useHpp) {
        cost = cartItem.product.buyPrice || 0;
      }

      const category = usePosStore
        .getState()
        .categories.find(c => c.id === cartItem.product.categoryId);

      const appliedModifiers = getAppliedModifierLabels(modifierIds, modifiers);

      return {
        productId: cartItem.product.id,
        name: cartItem.product.name,
        sku: cartItem.product.sku,
        categoryName: category?.name,
        quantity: cartItem.quantity,
        sellPrice: unitSell,
        cost,
        note: cartItem.note,
        hppId,
        recipeSnapshot,
        modifierIds: modifierIds.length ? modifierIds : undefined,
        appliedModifiers: appliedModifiers.length ? appliedModifiers : undefined,
      };
    });

    const trimmedOrderNote = localOrderNote.trim();

    const tx = {
      id: txId,
      timestamp,
      items: txItems,
      totalAmount: total,
      paymentMethod: method,
      cashGiven: method === 'CASH' ? cashParsed : undefined,
      change: method === 'CASH' ? change : undefined,
      orderNote: trimmedOrderNote || undefined,
    };

    addTransaction(tx);

    const { connectedPrinter, storeSettings } = usePosStore.getState();

    if (connectedPrinter) {
      try {
        await printReceipt(tx, storeSettings);
      } catch (err) {
        console.error('[Payment] Auto-print error:', err);
      }
    }

    const finalChange = method === 'CASH' ? change : 0;

    const finalItemsCount = items.reduce(
      (sum, i) => sum + i.quantity,
      0,
    );

    setSuccessData({
      txId,
      timestamp,
      total,
      paidAmount: method === 'CASH' ? cashParsed : total,
      change: finalChange,
      itemsCount: finalItemsCount,
      method,
      orderNote: trimmedOrderNote || undefined,
    });

    setIsPaid(true);
    clearCart();
  };

  const renderCartSummary = () => {
    const itemsCount = items.reduce(
      (sum, i) => sum + i.quantity,
      0,
    );

    return (
      <View style={styles.cartContainer}>
        <View style={styles.cartHeader}>
          <View style={styles.cartHeaderLeft}>
            <Ionicons
              name="cart-outline"
              size={22}
              color={Colors.text}
            />

            <Text style={styles.cartTitle}>
              Order Summary
            </Text>
          </View>

          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {itemsCount}
            </Text>
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
                <Text
                  style={styles.cartItemName}
                  numberOfLines={1}
                >
                  {item.product.name}
                </Text>

                <Text style={styles.cartItemDetails}>
                  {item.quantity} x Rp{' '}
                  {unitPrice.toLocaleString()}
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
                  <Text
                    style={styles.cartItemNote}
                    numberOfLines={2}
                  >
                    Note: {item.note}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.cartItemTotal}>
                Rp{' '}
                {(unitPrice * item.quantity).toLocaleString()}
              </Text>
            </View>
          );}}
          ListEmptyComponent={() => (
            <View style={styles.emptyCartContainer}>
              <Ionicons
                name="basket-outline"
                size={40}
                color={Colors.textMuted}
              />

              <Text style={styles.emptyText}>
                No items in cart
              </Text>
            </View>
          )}
        />

        <View style={styles.cartTotalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalRowLabel}>
              Subtotal
            </Text>

            <Text style={styles.totalRowVal}>
              Rp {total.toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.totalRow,
              { marginTop: Spacing.sm },
            ]}
          >
            <Text
              style={[
                styles.totalRowLabel,
                {
                  fontWeight: '700',
                  color: Colors.text,
                },
              ]}
            >
              Total Due
            </Text>

            <Text style={styles.totalDueVal}>
              Rp {total.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isPaid && successData) {
    return (
      <View style={styles.container}>
        <PaymentSuccessView
          data={successData}
          onDone={() => router.replace('/pos')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bodyLayout,
          showSplit && styles.rowLayout,
        ]}
      >
        {/* LEFT PANEL */}
        <View
          style={[
            styles.paymentPanel,
            showSplit && {
              flex: 1.2,
            },
          ]}
        >
          <Header
            title="Payment"
            onBack={() => router.back()}
          />

            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>
                  Amount Due
                </Text>

                <Text style={styles.totalValue}>
                  Rp {total.toLocaleString()}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>
                Payment Method
              </Text>

              <View style={styles.methodsRow}>
                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    method === 'CASH' &&
                      styles.methodActive,
                  ]}
                  onPress={() => setMethod('CASH')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={24}
                    color={
                      method === 'CASH'
                        ? Colors.primary
                        : Colors.textMuted
                    }
                  />

                  <Text
                    style={[
                      styles.methodText,
                      method === 'CASH' &&
                        styles.methodTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    method === 'QRIS' &&
                      styles.methodActive,
                  ]}
                  onPress={() => setMethod('QRIS')}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={24}
                    color={
                      method === 'QRIS'
                        ? Colors.primary
                        : Colors.textMuted
                    }
                  />

                  <Text
                    style={[
                      styles.methodText,
                      method === 'QRIS' &&
                        styles.methodTextActive,
                    ]}
                  >
                    QRIS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    method === 'CARD' &&
                      styles.methodActive,
                  ]}
                  onPress={() => setMethod('CARD')}
                >
                  <Ionicons
                    name="card-outline"
                    size={24}
                    color={
                      method === 'CARD'
                        ? Colors.primary
                        : Colors.textMuted
                    }
                  />

                  <Text
                    style={[
                      styles.methodText,
                      method === 'CARD' &&
                        styles.methodTextActive,
                    ]}
                  >
                    Card
                  </Text>
                </TouchableOpacity>
              </View>

              <InputField
                label="Order Note (optional)"
                placeholder="e.g. Take away, table 5..."
                value={localOrderNote}
                onChangeText={t => {
                  setLocalOrderNote(t);
                  setOrderNote(t);
                }}
                iconLeft="document-text-outline"
                multiline
                numberOfLines={2}
              />

              {method === 'CASH' && (
                <View style={styles.cashSection}>
                  <InputField
                    label="Cash Received (Rp)"
                    placeholder="0"
                    keyboardType="numeric"
                    value={cashGiven}
                    onChangeText={setCashGiven}
                    iconLeft="wallet-outline"
                  />

                  {cashParsed > 0 && (
                    <View style={styles.changeBox}>
                      <Text style={styles.changeLabel}>
                        Change Summary
                      </Text>

                      <View style={styles.changeRow}>
                        <Text style={styles.changeText}>
                          Expected Change:
                        </Text>

                        <Text
                          style={[
                            styles.changeVal,
                            {
                              color:
                                cashParsed >= total
                                  ? Colors.success
                                  : Colors.error,
                            },
                          ]}
                        >
                          {cashParsed >= total
                            ? `Rp ${change.toLocaleString()}`
                            : 'Not enough cash'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Button
                label={
                  method === 'CASH'
                    ? `Confirm Payment (Change: Rp ${change.toLocaleString()})`
                    : 'Confirm Payment'
                }
                variant="primary"
                fullWidth
                disabled={!canPay}
                onPress={handleConfirm}
              />
            </View>
          </View>

        {/* RIGHT PANEL */}
        {showSplit && (
          <View
            style={[
              styles.rightPanel,
              {
                flex: 1,
                borderLeftWidth: 1,
                borderLeftColor: Colors.surfaceBorder,
              },
            ]}
          >
            {renderCartSummary()}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  bodyLayout: {
    flex: 1,
  },

  rowLayout: {
    flexDirection: 'row',
  },

  paymentPanel: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  rightPanel: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },

  totalBox: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.xxl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },

  totalLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
  },

  totalValue: {
    color: Colors.text,
    fontSize: Typography.xxxl,
    fontWeight: '800',
  },

  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '700',
  },

  methodsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  methodBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },

  methodActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '11',
  },

  methodText: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    fontWeight: '600',
  },

  methodTextActive: {
    color: Colors.primary,
  },

  cashSection: {
    gap: Spacing.md,
  },

  changeBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.surfaceBorder,
  },

  changeLabel: {
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },

  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  changeText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },

  changeVal: {
    fontSize: Typography.md,
    fontWeight: '700',
  },

  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },

  cartContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    // borderBottomWidth: 1,
    // borderBottomColor: Colors.surfaceBorder,
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
    // borderTopWidth: 1,
    // borderTopColor: Colors.surfaceBorder,
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