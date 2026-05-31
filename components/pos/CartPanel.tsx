import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCartLineUnitPrice, selectCartTotal, useCartStore } from '../../store/useCartStore';
import { usePosStore } from '../../store/usePosStore';
import { useAppPopup } from '../../hooks/useAppPopup';
import {
    navigateToSelectTable,
    saveTableOrderAndContinue,
    type TableOrderNavFrom,
    type TableSaleMode,
} from '../../utils/tableOrderFlow';
import { Button, Colors, Radius, Spacing, Typography } from '../ui';
import CartItemNotePopup from './CartItemNotePopup';
import CartModifierPopup from './CartModifierPopup';

type CartPanelProps = {
  /** Where Sale was opened from — drives save success navigation */
  navFrom?: TableOrderNavFrom;
  /** add = adding new items from table; edit = editing full order */
  tableSaleMode?: TableSaleMode;
};

export default function CartPanel({ navFrom = 'pos', tableSaleMode }: CartPanelProps) {
  const router = useRouter();
  const { showMessage, AppPopup } = useAppPopup();
  const {
    items,
    updateQuantity,
    updateItemNote,
    updateItemModifiers,
    removeItem,
    getCartItemsForCheck,
    activeTableId,
    orderNote,
  } = useCartStore();
  const cartTotal = useCartStore(selectCartTotal);
  const canAddToCart = usePosStore((state) => state.canAddToCart);
  const modifiers = usePosStore((state) => state.modifiers);

  const [noteTargetId, setNoteTargetId] = useState<string | null>(null);
  const [modifierTargetId, setModifierTargetId] = useState<string | null>(null);
  const noteTarget = items.find((i) => i.cartItemId === noteTargetId);
  const modifierTarget = items.find((i) => i.cartItemId === modifierTargetId);

  const availableForTarget = modifierTarget
    ? (modifierTarget.product.modifierIds ?? [])
        .map(id => modifiers.find(m => m.id === id))
        .filter((m): m is NonNullable<typeof m> => !!m)
    : [];

  const handleCheckout = () => {
    if (items.length > 0) {
      router.push({
        pathname: '/pos/payment',
        params: activeTableId
          ? { from: navFrom, tableId: activeTableId }
          : undefined,
      });
    }
  };

  const handleSaveTableOrder = () => {
    if (!items.length) {
      showMessage({
        title: 'Empty cart',
        description: 'Add items before saving the table order.',
        icon: 'cart-outline',
        iconColor: Colors.warning,
      });
      return;
    }
    if (!activeTableId) {
      navigateToSelectTable(router);
      return;
    }
    void saveTableOrderAndContinue(router, {
      tableId: activeTableId,
      items,
      orderNote,
      navFrom,
      saleMode: tableSaleMode,
    });
  };

  const hidePayNow = tableSaleMode === 'add';

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={48} color={Colors.surfaceBorder} />
          <Text style={styles.emptyText}>Cart is empty</Text>
          <Text style={styles.emptySubText}>Tap a product to add it</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.cartItemId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const cartCheck = getCartItemsForCheck();
            const canIncrement = canAddToCart(
              item.product.id,
              1,
              cartCheck,
              item.modifierIds
            );
            const unitPrice = getCartLineUnitPrice(item);
            const modLabels = (item.modifierIds ?? [])
              .map(id => modifiers.find(m => m.id === id)?.name)
              .filter(Boolean);

            return (
              <View style={styles.cartItem}>
                <TouchableOpacity
                  style={styles.itemInfo}
                  activeOpacity={0.7}
                  onPress={() => setNoteTargetId(item.cartItemId)}
                >
                  <View style={styles.itemNameRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <View style={styles.itemActions}>
                      {(item.product.modifierIds?.length ?? 0) > 0 && (
                        <TouchableOpacity
                          onPress={() => setModifierTargetId(item.cartItemId)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={item.modifierIds?.length ? 'options' : 'options-outline'}
                            size={14}
                            color={item.modifierIds?.length ? Colors.primary : Colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                      <Ionicons
                        name={item.note ? 'document-text' : 'create-outline'}
                        size={14}
                        color={item.note ? Colors.primary : Colors.textMuted}
                      />
                    </View>
                  </View>
                  <Text style={styles.itemPrice}>
                    Rp {(unitPrice * item.quantity).toLocaleString()}
                  </Text>
                  {modLabels.length > 0 ? (
                    <Text style={styles.itemNote} numberOfLines={2}>
                      {modLabels.join(', ')}
                    </Text>
                  ) : null}
                  {item.note ? (
                    <Text style={styles.itemNote} numberOfLines={2}>
                      {item.note}
                    </Text>
                  ) : (
                    <Text style={styles.itemNoteHint}>Tap to add note</Text>
                  )}
                  {!canIncrement && (
                    <Text style={styles.stockWarning}>
                      <Ionicons name="alert-circle-outline" size={10} color={Colors.warning} /> Max
                      qty reached
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      item.quantity > 1
                        ? updateQuantity(item.cartItemId, item.quantity - 1)
                        : removeItem(item.cartItemId)
                    }
                  >
                    <Ionicons
                      name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                      size={16}
                      color={item.quantity === 1 ? Colors.error : Colors.text}
                    />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={[styles.qtyBtn, !canIncrement && styles.qtyBtnDisabled]}
                    onPress={() => {
                      if (canAddToCart(item.product.id, 1, cartCheck, item.modifierIds)) {
                        updateQuantity(item.cartItemId, item.quantity + 1);
                      }
                    }}
                    disabled={!canIncrement}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={canIncrement ? Colors.text : Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>Rp {cartTotal.toLocaleString()}</Text>
        </View>
        <Button
          label="Save table order"
          variant="secondary"
          fullWidth
          iconLeft="bookmark-outline"
          disabled={items.length === 0}
          onPress={handleSaveTableOrder}
        />
        {!hidePayNow ? (
          <Button
            label={activeTableId ? 'Pay now' : 'Proceed to Payment'}
            variant="primary"
            fullWidth
            disabled={items.length === 0}
            onPress={handleCheckout}
          />
        ) : null}
      </View>

      <CartItemNotePopup
        visible={!!noteTarget}
        productName={noteTarget?.product.name ?? ''}
        initialNote={noteTarget?.note ?? ''}
        onClose={() => setNoteTargetId(null)}
        onSave={(note) => {
          if (noteTargetId) updateItemNote(noteTargetId, note);
        }}
      />

      <CartModifierPopup
        visible={!!modifierTarget}
        productName={modifierTarget?.product.name ?? ''}
        availableModifiers={availableForTarget}
        selectedIds={modifierTarget?.modifierIds ?? []}
        onClose={() => setModifierTargetId(null)}
        onSave={(ids) => {
          if (modifierTargetId) updateItemModifiers(modifierTargetId, ids);
          setModifierTargetId(null);
        }}
      />
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: Colors.surfaceBorder,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.md,
    fontWeight: '600',
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
  },
  list: {
    padding: Spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  itemInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemName: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '600',
    flex: 1,
  },
  itemPrice: {
    color: Colors.primaryLight,
    fontSize: Typography.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  itemNote: {
    color: Colors.primary,
    fontSize: Typography.xs,
    fontStyle: 'italic',
    marginTop: 4,
  },
  itemNoteHint: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  stockWarning: {
    color: Colors.warning,
    fontSize: 10,
    marginTop: 2,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  qtyBtn: {
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 34,
  },
  qtyBtnDisabled: {
    opacity: 0.35,
  },
  qtyText: {
    color: Colors.text,
    width: 26,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: Typography.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.lg,
  },
  summaryValue: {
    color: Colors.success,
    fontSize: Typography.xxl,
    fontWeight: '800',
  },
});
