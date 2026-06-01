import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import uuid from 'react-native-uuid';
import OrderCartSummary from '../../../components/pos/OrderCartSummary';
import {
  PaymentSuccessPanel,
  type PaymentSuccessData,
} from '../../../components/pos/PaymentSuccessView';
import {
  Button,
  Colors,
  Header,
  InputField,
  Radius,
  Spacing,
  splitPanel60_40,
  Typography,
} from '../../../components/ui';
import { usePreventScreenBack } from '../../../hooks/usePreventScreenBack';
import { useCartStore } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';
import {
  computeModifierAwareCost,
  getAppliedModifierLabels,
  getModifierPriceDelta,
  mergeRecipeLines,
  recipeIngredientsToLines,
} from '../../../utils/modifierUtils';
import { dispatchPaymentPrint, dispatchReprint, type ReceiptTx } from '../../../utils/printerRouting';

type PaymentMethod = 'CASH' | 'QRIS' | 'CARD';

/** Common Indonesian cash denominations (Rupiah). */
const QUICK_CASH_RUPIAH = [
  { label: '20 rb', amount: 20_000 },
  { label: '50 rb', amount: 50_000 },
  { label: '100 rb', amount: 100_000 },
  { label: '200 rb', amount: 200_000 },
  { label: '500 rb', amount: 500_000 },
] as const;

export default function PaymentScreen() {
  const router = useRouter();
  const { from, tableId: tableIdParam } = useLocalSearchParams<{
    from?: string;
    tableId?: string;
  }>();
  const { width, height } = useWindowDimensions();

  const {
    getTotal,
    items,
    orderNote,
    setOrderNote,
    refreshFromStore,
    activeTableId,
    clearCart,
  } = useCartStore();

  useEffect(() => {
    refreshFromStore();
  }, [refreshFromStore]);

  const { addTransaction, getRecipeCost, recipes, modifiers } = usePosStore();

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [localOrderNote, setLocalOrderNote] = useState(orderNote);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [successData, setSuccessData] = useState<PaymentSuccessData | null>(null);
  const [completedTableId, setCompletedTableId] = useState<string | null>(null);
  const [completedReceiptTx, setCompletedReceiptTx] = useState<ReceiptTx | null>(null);

  const total = getTotal();
  const cashParsed = parseFloat(cashGiven) || 0;
  const change = Math.max(0, cashParsed - total);

  const addQuickCash = (amount: number) => {
    const next = (parseFloat(cashGiven) || 0) + amount;
    setCashGiven(String(next));
  };

  const setExactCash = () => {
    setCashGiven(String(Math.ceil(total)));
  };

  const canPay = method !== 'CASH' || cashParsed >= total;

  usePreventScreenBack(paymentComplete);

  const isLandscape = width > height;
  const isTablet = width >= 768;
  const showSplit = isLandscape || isTablet;

  const paymentBackTableId = tableIdParam || activeTableId;

  const handlePaymentBack = () => {
    if (from === 'orders' && paymentBackTableId) {
      router.replace({
        pathname: '/orders/[tableId]',
        params: { tableId: paymentBackTableId },
      });
      return;
    }
    router.back();
  };

  const handleDone = () => {
    if (completedTableId) {
      usePosStore.getState().clearTable(completedTableId);
    }
    clearCart();
    setOrderNote('');
    setPaymentComplete(false);
    setSuccessData(null);
    setCompletedTableId(null);
    setCompletedReceiptTx(null);
    router.replace('/pos');
  };

  const renderPaymentSuccess = () => {
    if (!successData) return null;
    return (
      <PaymentSuccessPanel
        data={successData}
        onDone={handleDone}
        doneLabel="Back to POS"
        onPrint={canPrint && completedReceiptTx ? handleReprint : undefined}
      />
    );
  };

  const handleReprint = async () => {
    if (!completedReceiptTx) return;
    dispatchReprint(completedReceiptTx);
  };

  const handleConfirm = async () => {
    if (!canPay) return;

    const wasTablePayment = !!activeTableId;
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
    const tableForPrint = wasTablePayment
      ? usePosStore.getState().diningTables.find(t => t.id === activeTableId)
      : undefined;
    const openOrder = wasTablePayment
      ? usePosStore.getState().tableOrders.find(
          o => o.tableId === activeTableId && o.status === 'OPEN'
        )
      : undefined;

    const tx = {
      id: txId,
      timestamp,
      items: txItems,
      totalAmount: total,
      paymentMethod: method,
      cashGiven: method === 'CASH' ? cashParsed : undefined,
      change: method === 'CASH' ? change : undefined,
      orderNote: trimmedOrderNote || undefined,
      tableName: tableForPrint?.name,
      zone: tableForPrint?.zone,
      documentNo: openOrder?.documentNo,
    };

    addTransaction(tx);

    const tableIdToClear = wasTablePayment ? activeTableId : null;

    dispatchPaymentPrint(tx);

    const finalChange = method === 'CASH' ? change : 0;
    const finalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

    const success: PaymentSuccessData = {
      txId,
      timestamp,
      total,
      paidAmount: method === 'CASH' ? cashParsed : total,
      change: finalChange,
      itemsCount: finalItemsCount,
      method,
      orderNote: trimmedOrderNote || undefined,
    };

    if (showSplit) {
      setSuccessData(success);
      setCompletedTableId(tableIdToClear);
      setCompletedReceiptTx(tx);
      setPaymentComplete(true);
      return;
    }

    router.replace({
      pathname: '/pos/success',
      params: {
        txId,
        timestamp,
        total: String(total),
        paidAmount: String(method === 'CASH' ? cashParsed : total),
        change: String(finalChange),
        itemsCount: String(finalItemsCount),
        method,
        orderNote: trimmedOrderNote || '',
        returnTo: '/pos',
        ...(tableIdToClear ? { clearTableId: tableIdToClear } : {}),
      },
    });
  };

  const renderCartSummary = () => (
    <OrderCartSummary items={items} modifiers={modifiers} total={total} />
  );

  const canPrint = usePosStore(s => s.printerStations.some(p => p.enabled && p.device));

  const renderPaymentForm = () => (
    <View style={styles.paymentForm}>
      <ScrollView style={styles.paymentFormScroll} contentContainerStyle={styles.content}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Amount Due</Text>
          <Text style={styles.totalValue}>Rp {total.toLocaleString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>

        <View style={styles.methodsRow}>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'CASH' && styles.methodActive]}
            onPress={() => setMethod('CASH')}
          >
            <Ionicons
              name="cash-outline"
              size={24}
              color={method === 'CASH' ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.methodText, method === 'CASH' && styles.methodTextActive]}>
              Cash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, method === 'QRIS' && styles.methodActive]}
            onPress={() => setMethod('QRIS')}
          >
            <Ionicons
              name="qr-code-outline"
              size={24}
              color={method === 'QRIS' ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.methodText, method === 'QRIS' && styles.methodTextActive]}>
              QRIS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, method === 'CARD' && styles.methodActive]}
            onPress={() => setMethod('CARD')}
          >
            <Ionicons
              name="card-outline"
              size={24}
              color={method === 'CARD' ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.methodText, method === 'CARD' && styles.methodTextActive]}>
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
            <Text style={styles.quickLabel}>Quick amount (Rp)</Text>
            <View style={styles.quickRow}>
              {QUICK_CASH_RUPIAH.map(chip => (
                <TouchableOpacity
                  key={chip.amount}
                  style={styles.quickChip}
                  onPress={() => addQuickCash(chip.amount)}
                >
                  <Text style={styles.quickChipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickChip, styles.quickChipAccent]}
                onPress={setExactCash}
              >
                <Text style={[styles.quickChipText, styles.quickChipTextAccent]}>Pas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => setCashGiven('')}
              >
                <Text style={styles.quickChipText}>Clear</Text>
              </TouchableOpacity>
            </View>

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
                <Text style={styles.changeLabel}>Change Summary</Text>
                <View style={styles.changeRow}>
                  <Text style={styles.changeText}>Expected Change:</Text>
                  <Text
                    style={[
                      styles.changeVal,
                      { color: cashParsed >= total ? Colors.success : Colors.error },
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
  );

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
            showSplit && splitPanel60_40.left,
          ]}
        >
          {!paymentComplete ? (
            <Header title="Payment" onBack={handlePaymentBack} />
          ) : null}

          {paymentComplete ? renderPaymentSuccess() : renderPaymentForm()}
        </View>

        {showSplit && (
          <View
            style={[
              styles.rightPanel,
              splitPanel60_40.right,
              {
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

  paymentForm: {
    flex: 1,
  },

  paymentFormScroll: {
    flex: 1,
  },

  rightPanel: {
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

  quickLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: '600',
  },

  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  quickChipAccent: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },

  quickChipText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: Typography.sm,
  },

  quickChipTextAccent: {
    color: Colors.primary,
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
});