import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Header, Colors, Spacing, Typography, Radius, Popup } from '../../../components/ui';
import { usePosStore, TransactionItem } from '../../../store/usePosStore';
import { Ionicons } from '@expo/vector-icons';
import { printReceipt } from '../../../utils/bluetoothPrinter';

// ── Reusable Confirmation Popup ─────────────────────────────────────────────
interface ConfirmPopupProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

function ConfirmPopup({
  visible, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', icon = 'alert-circle-outline', iconColor = Colors.error,
}: ConfirmPopupProps) {
  return (
    <Popup
      visible={visible}
      onClose={onClose}
      icon={icon}
      iconColor={iconColor}
      title={title}
      description={description}
      actions={[
        {
          label: confirmLabel,
          variant: 'danger',
          icon: 'trash-outline',
          onPress: () => { onClose(); onConfirm(); },
        },
        {
          label: 'Cancel',
          variant: 'ghost',
          onPress: onClose,
        },
      ]}
    />
  );
}

// ── Void Item Selector Popup (with qty control) ─────────────────────────────
interface VoidItemPopupProps {
  visible: boolean;
  onClose: () => void;
  items: TransactionItem[];
  onVoidItem: (productId: string, qty: number) => void;
}

function VoidItemPopup({ visible, onClose, items, onVoidItem }: VoidItemPopupProps) {
  const [selectedItem, setSelectedItem] = useState<TransactionItem | null>(null);
  const [voidQty, setVoidQty] = useState(1);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const activeItems = items.filter(i => i.status !== 'CANCELED');

  const handleSelectItem = (item: TransactionItem) => {
    setSelectedItem(item);
    setVoidQty(item.quantity); // default: void all
  };

  const handleOpenConfirm = () => {
    if (selectedItem) setConfirmVisible(true);
  };

  const handleConfirmVoid = () => {
    if (selectedItem) {
      onVoidItem(selectedItem.productId, voidQty);
      setSelectedItem(null);
      setVoidQty(1);
      onClose();
    }
  };

  const handleQtyChange = (delta: number) => {
    if (!selectedItem) return;
    setVoidQty(q => Math.min(Math.max(1, q + delta), selectedItem.quantity));
  };

  const handleClose = () => {
    setSelectedItem(null);
    setVoidQty(1);
    onClose();
  };

  return (
    <>
      <Popup
        visible={visible && !confirmVisible}
        onClose={handleClose}
        icon="receipt-outline"
        iconColor={Colors.warning}
        title="Void Item"
        description="Select an item, choose how many to void, then confirm."
      >
        <View style={voidStyles.root}>
          {/* ── Item List ── */}
          {activeItems.length === 0 ? (
            <View style={voidStyles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={36} color={Colors.success} />
              <Text style={voidStyles.emptyText}>All items have been voided</Text>
            </View>
          ) : (
            <View style={voidStyles.itemList}>
              {activeItems.map((item) => {
                const isSelected = selectedItem?.productId === item.productId;
                return (
                  <TouchableOpacity
                    key={item.productId + item.name}
                    style={[voidStyles.itemRow, isSelected && voidStyles.itemRowSelected]}
                    onPress={() => handleSelectItem(item)}
                    activeOpacity={0.75}
                  >
                    <View style={voidStyles.itemRowLeft}>
                      <View style={[voidStyles.qtyBadge, isSelected && { backgroundColor: Colors.primary + '30' }]}>
                        <Text style={[voidStyles.qtyBadgeText, isSelected && { color: Colors.primary }]}>
                          {item.quantity}×
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[voidStyles.itemName, isSelected && { color: Colors.primary }]}>
                          {item.name}
                        </Text>
                        <Text style={voidStyles.itemSubtext}>
                          Rp {(item.sellPrice * item.quantity).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Qty Control (visible once item is selected) ── */}
          {selectedItem && (
            <View style={voidStyles.qtyControl}>
              <Text style={voidStyles.qtyLabel}>Qty to void</Text>

              <View style={voidStyles.qtyRow}>
                <TouchableOpacity
                  style={[voidStyles.qtyBtn, voidQty <= 1 && voidStyles.qtyBtnDisabled]}
                  onPress={() => handleQtyChange(-1)}
                  disabled={voidQty <= 1}
                >
                  <Ionicons name="remove" size={18} color={voidQty <= 1 ? Colors.textMuted : Colors.text} />
                </TouchableOpacity>

                <View style={voidStyles.qtyDisplay}>
                  <Text style={voidStyles.qtyValue}>{voidQty}</Text>
                  <Text style={voidStyles.qtyMax}>/ {selectedItem.quantity}</Text>
                </View>

                <TouchableOpacity
                  style={[voidStyles.qtyBtn, voidQty >= selectedItem.quantity && voidStyles.qtyBtnDisabled]}
                  onPress={() => handleQtyChange(1)}
                  disabled={voidQty >= selectedItem.quantity}
                >
                  <Ionicons name="add" size={18} color={voidQty >= selectedItem.quantity ? Colors.textMuted : Colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={voidStyles.qtyHint}>
                {voidQty === selectedItem.quantity
                  ? 'Entire item will be marked VOID'
                  : `${selectedItem.quantity - voidQty} unit(s) will remain`}
              </Text>

              <TouchableOpacity style={voidStyles.confirmBtn} onPress={handleOpenConfirm} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={16} color={Colors.white} />
                <Text style={voidStyles.confirmBtnText}>
                  Void {voidQty}× {selectedItem.name}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={voidStyles.cancelRow} onPress={handleClose}>
            <Text style={voidStyles.cancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Popup>

      {/* Nested confirmation */}
      <ConfirmPopup
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onConfirm={handleConfirmVoid}
        title={`Void ${voidQty}× ${selectedItem?.name ?? 'Item'}?`}
        description={
          voidQty === selectedItem?.quantity
            ? `All ${voidQty} unit(s) will be canceled and stock returned.`
            : `${voidQty} unit(s) will be removed. ${(selectedItem?.quantity ?? 0) - voidQty} unit(s) remain. Stock will be adjusted accordingly.`
        }
        confirmLabel={`Void ${voidQty} Unit(s)`}
      />
    </>
  );
}

const voidStyles = StyleSheet.create({
  root: { width: '100%', gap: Spacing.md, marginTop: Spacing.sm },
  itemList: { gap: Spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  itemRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  itemRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  qtyBadge: {
    backgroundColor: Colors.surfaceBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 30,
    alignItems: 'center',
  },
  qtyBadgeText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '700' },
  itemName: { color: Colors.text, fontSize: Typography.sm, fontWeight: '600' },
  itemSubtext: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  emptyState: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sm },

  // Qty control block
  qtyControl: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  qtyLabel: { color: Colors.textSecondary, fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  qtyBtn: {
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: Spacing.lg,
  },
  qtyValue: { color: Colors.text, fontSize: Typography.xl, fontWeight: '800' },
  qtyMax: { color: Colors.textMuted, fontSize: Typography.sm },
  qtyHint: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xs,
    width: '100%',
    justifyContent: 'center',
  },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.md },

  cancelRow: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  cancelText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },
});

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function TransactionsDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, products, getRecipeCost, voidTransaction, voidTransactionItem, storeSettings } = usePosStore();

  const [voidOrderVisible, setVoidOrderVisible] = useState(false);
  const [voidItemPickerVisible, setVoidItemPickerVisible] = useState(false);

  const tx = transactions.find(t => t.id === id);

  const handleReprint = async () => {
    if (!tx) return;
    try {
      const success = await printReceipt(tx, storeSettings);
      if (success) {
        Alert.alert('Success', 'Receipt sent to printer.');
      } else {
        Alert.alert('Failed', 'Could not print receipt. Please check printer connection in Settings.');
      }
    } catch (err: any) {
      console.error('Reprint error:', err);
      Alert.alert('Error', err.message || 'An error occurred.');
    }
  };

  if (!tx) {
    return (
      <View style={styles.container}>
        <Header title="Receipt Error" onBack={() => router.back()} />
        <Text style={styles.errorText}>Transaction not found.</Text>
      </View>
    );
  }

  const dateStr = new Date(tx.timestamp).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

  const activeItems = tx.items.filter(i => i.status !== 'CANCELED');
  const canVoidItems = tx.status !== 'CANCELED' && activeItems.length > 1;
  const canVoidOrder = tx.status !== 'CANCELED';

  // Compute profit metrics (active items only)
  const totalCost = tx.items.reduce((sum, item) => {
    if (item.status === 'CANCELED') return sum;
    let unitCost = item.cost;
    if (unitCost === undefined || unitCost === 0) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        unitCost = product.useHpp && product.hppId ? getRecipeCost(product.hppId) : (product.buyPrice || 0);
      }
    }
    return sum + ((unitCost || 0) * (item.quantity || 0));
  }, 0);

  const profit = (tx.totalAmount || 0) - totalCost;

  // 3-dot header menu
  const headerActions = [];
  if (canVoidItems) {
    headerActions.push({
      icon: 'ellipsis-vertical' as keyof typeof Ionicons.glyphMap,
      onPress: () => setVoidItemPickerVisible(true),
    });
  }

  return (
    <View style={styles.container}>
      <Header
        title="Transaction Details"
        onBack={() => router.back()}
        actions={headerActions}
      />

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Receipt Card ── */}
        <View style={styles.receiptCard}>
          <Text style={styles.receiptHeader}>{storeSettings.name}</Text>
          <Text style={styles.receiptAddress}>{storeSettings.address}</Text>

          <View style={styles.statusBadgeRow}>
            <Text style={styles.receiptId}>ID: {tx.id.substring(0, 6)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: tx.status === 'CANCELED' ? Colors.error + '20' : Colors.success + '20' }]}>
              <Text style={[styles.statusText, { color: tx.status === 'CANCELED' ? Colors.error : Colors.success }]}>
                {tx.status}
              </Text>
            </View>
          </View>

          <Text style={styles.receiptDate}>{dateStr}</Text>
          {tx.orderNote ? (
            <View style={styles.orderNoteBox}>
              <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
              <Text style={styles.orderNoteText}>{tx.orderNote}</Text>
            </View>
          ) : null}
          <View style={styles.divider} />

          {tx.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' }}>
                  <Text style={[styles.itemName, item.status === 'CANCELED' && styles.textStrikethrough]}>
                    {item.name}
                  </Text>
                  {item.status === 'CANCELED' && (
                    <View style={styles.itemStatusBadge}>
                      <Text style={styles.itemStatusText}>VOID</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemDetail}>
                  {item.categoryName ? `${item.categoryName} • ` : ''}
                  {item.sku ? `SKU: ${item.sku}` : ''}
                </Text>
                <Text style={styles.itemQty}>{item.quantity} × Rp {item.sellPrice.toLocaleString()}</Text>
                {item.note ? (
                  <Text style={styles.itemNoteLine}>Note: {item.note}</Text>
                ) : null}
              </View>
              <Text style={[styles.itemTotal, item.status === 'CANCELED' && styles.textStrikethrough]}>
                Rp {(item.quantity * item.sellPrice).toLocaleString()}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryValue}>Rp {tx.totalAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelSub}>Payment Method</Text>
            <Text style={styles.summaryValueSub}>{tx.paymentMethod}</Text>
          </View>
          {tx.paymentMethod === 'CASH' && tx.cashGiven !== undefined && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSub}>Cash Received</Text>
              <Text style={styles.summaryValueSub}>Rp {tx.cashGiven.toLocaleString()}</Text>
            </View>
          )}
          {tx.paymentMethod === 'CASH' && tx.change !== undefined && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelSub}>Total Change</Text>
              <Text style={styles.summaryValueSub}>Rp {tx.change.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* ── Business Metrics ── */}
        <View style={styles.metricsBox}>
          <Text style={styles.metricsTitle}>Business Analytics</Text>
          <View style={styles.metricRow}>
            <View>
              <Text style={styles.metricLabel}>Total COGS (HPP)</Text>
              <Text style={styles.metricDesc}>Estimated cost of goods sold</Text>
            </View>
            <Text style={styles.metricValue}>Rp {totalCost.toLocaleString()}</Text>
          </View>

          <View style={[styles.metricRow, { marginTop: Spacing.md }]}>
            <View>
              <Text style={styles.metricLabel}>Gross Profit</Text>
              <Text style={styles.metricDesc}>Revenue − Total COGS</Text>
            </View>
            <Text style={[styles.metricValueLarge, { color: profit >= 0 ? Colors.success : Colors.error }]}>
              Rp {profit.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.metricRow, { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, paddingTop: Spacing.sm }]}>
            <Text style={styles.metricLabel}>Profit Margin</Text>
            <Text style={[styles.metricValue, { color: profit >= 0 ? Colors.success : Colors.error }]}>
              {tx.totalAmount > 0 ? ((profit / tx.totalAmount) * 100).toFixed(1) : '0'}%
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.reprintBtn}
            onPress={handleReprint}
            activeOpacity={0.8}
          >
            <Ionicons name="print-outline" size={18} color={Colors.white} />
            <Text style={styles.reprintText}>Reprint Receipt</Text>
          </TouchableOpacity>

          {canVoidItems && (
            <TouchableOpacity
              style={styles.voidItemBtn}
              onPress={() => setVoidItemPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="remove-circle-outline" size={18} color={Colors.warning} />
              <Text style={styles.voidItemText}>Void Item</Text>
            </TouchableOpacity>
          )}

          {canVoidOrder && (
            <TouchableOpacity
              style={styles.voidOrderBtn}
              onPress={() => setVoidOrderVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.voidOrderText}>Void Entire Order</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* ── Void Entire Order Confirmation ── */}
      <ConfirmPopup
        visible={voidOrderVisible}
        onClose={() => setVoidOrderVisible(false)}
        onConfirm={() => voidTransaction(tx.id)}
        title="Void Entire Order?"
        description="All items will be canceled and their stock returned. This cannot be undone."
        confirmLabel="Void Order"
        icon="alert-circle-outline"
        iconColor={Colors.error}
      />

      {/* ── Void Item Picker ── */}
      <VoidItemPopup
        visible={voidItemPickerVisible}
        onClose={() => setVoidItemPickerVisible(false)}
        items={tx.items}
        onVoidItem={(productId, qty) => voidTransactionItem(tx.id, productId, qty)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  errorText: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xxxl },

  receiptCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderStyle: 'dashed',
  },
  receiptHeader: { color: Colors.text, fontSize: Typography.xl, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.xs },
  receiptAddress: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center', marginBottom: Spacing.xs },
  receiptId: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', fontFamily: 'monospace' },
  receiptDate: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', marginBottom: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: Spacing.md },

  statusBadgeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.text, fontSize: Typography.md, fontWeight: '600' },
  itemDetail: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  itemQty: { color: Colors.textSecondary, fontSize: Typography.sm, marginTop: 1 },
  itemNoteLine: { color: Colors.primary, fontSize: Typography.xs, fontStyle: 'italic', marginTop: 4 },
  orderNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '12',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  orderNoteText: { flex: 1, color: Colors.text, fontSize: Typography.sm, fontStyle: 'italic' },
  itemTotal: { color: Colors.text, fontSize: Typography.md, fontWeight: '600' },

  textStrikethrough: { textDecorationLine: 'line-through', color: Colors.textMuted },
  itemStatusBadge: { backgroundColor: Colors.error + '15', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  itemStatusText: { color: Colors.error, fontSize: 8, fontWeight: 'bold' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  summaryLabel: { color: Colors.text, fontSize: Typography.lg, fontWeight: '700' },
  summaryValue: { color: Colors.primaryLight, fontSize: Typography.lg, fontWeight: '800' },
  summaryLabelSub: { color: Colors.textSecondary, fontSize: Typography.sm },
  summaryValueSub: { color: Colors.text, fontSize: Typography.sm },

  metricsBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  metricsTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '700', marginBottom: Spacing.md },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { color: Colors.text, fontWeight: '600', fontSize: Typography.sm },
  metricDesc: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  metricValue: { color: Colors.text, fontWeight: '600', fontSize: Typography.sm },
  metricValueLarge: { fontSize: Typography.md, fontWeight: '800' },

  actionsRow: { gap: Spacing.sm },
  voidItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + '10',
  },
  voidItemText: { color: Colors.warning, fontSize: Typography.md, fontWeight: '700' },
  voidOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  voidOrderText: { color: Colors.error, fontSize: Typography.md, fontWeight: '700' },
  reprintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  reprintText: { color: Colors.white, fontSize: Typography.md, fontWeight: '700' },
});
