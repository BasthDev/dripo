import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, Colors, Spacing, Typography, Radius, Popup } from '../../../components/ui';
import { usePosStore, Ingredient } from '../../../store/usePosStore';

type Mode = 'view' | 'update';

interface StockUpdateEntry {
  ingredientId: string;
  value: string; // added quantity as string
}

export default function LowStockScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { ingredients, getLowStockIngredients, updateIngredient } = usePosStore();

  const [mode, setMode] = useState<Mode>('view');
  const [entries, setEntries] = useState<StockUpdateEntry[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  const lowStockItems = getLowStockIngredients();

  // Show all items in update mode so they can adjust anything, otherwise only low stock
  const displayItems = mode === 'update' ? [...ingredients].sort((a, b) => a.stock - b.stock) : lowStockItems;

  React.useEffect(() => {
    if (params.mode === 'update') {
      handleEnterUpdateMode();
    }
  }, [params.mode]);

  const getEntry = (id: string) => entries.find(e => e.ingredientId === id);

  const setEntry = (id: string, value: string) => {
    setEntries(prev => {
      const existing = prev.find(e => e.ingredientId === id);
      if (existing) return prev.map(e => e.ingredientId === id ? { ...e, value } : e);
      return [...prev, { ingredientId: id, value }];
    });
  };

  const handleEnterUpdateMode = () => {
    // Pre-fill entries with "0" as we are doing positive increment updates
    const prefilled = ingredients.map(ing => ({
      ingredientId: ing.id,
      value: '0',
    }));
    setEntries(prefilled);
    setMode('update');
  };

  const handleCancelUpdate = () => {
    setEntries([]);
    setMode('view');
    // Clear URL params so going back to view mode is clean
    router.setParams({ mode: undefined });
  };

  const handleSave = () => {
    for (const entry of entries) {
      const addedQty = parseFloat(entry.value);
      if (isNaN(addedQty) || addedQty === 0) continue;
      const ing = ingredients.find(i => i.id === entry.ingredientId);
      if (!ing) continue;
      
      // Update by adding (+) instead of replacing
      updateIngredient(entry.ingredientId, { stock: ing.stock + addedQty });
    }
    setEntries([]);
    setMode('view');
    setConfirmVisible(false);
    setSavedVisible(true);
    // Clear URL params
    router.setParams({ mode: undefined });
  };

  const unitLabel = (ing: Ingredient) => {
    if (ing.type === 'WEIGHT') return 'g';
    if (ing.type === 'VOLUME') return 'ml';
    return 'pcs';
  };

  const getSeverity = (ing: Ingredient): 'critical' | 'low' | 'ok' => {
    if (ing.stock <= 0) return 'critical';
    if (ing.lowStockThreshold !== undefined && ing.stock <= ing.lowStockThreshold) return 'low';
    return 'ok';
  };

  const severityColor = (s: ReturnType<typeof getSeverity>) => {
    if (s === 'critical') return Colors.error;
    if (s === 'low') return Colors.warning;
    return Colors.success;
  };

  const severityIcon = (s: ReturnType<typeof getSeverity>): keyof typeof Ionicons.glyphMap => {
    if (s === 'critical') return 'close-circle';
    if (s === 'low') return 'alert-circle';
    return 'checkmark-circle';
  };

  const changedCount = entries.filter(e => {
    const addedQty = parseFloat(e.value);
    const ing = ingredients.find(i => i.id === e.ingredientId);
    return !isNaN(addedQty) && ing && addedQty > 0;
  }).length;

  return (
    <View style={styles.container}>
      <Header
        title={mode === 'update' ? 'Add Stock' : 'Low Stock Alert'}
        onBack={mode === 'update' ? handleCancelUpdate : () => router.back()}
        actions={
          mode === 'view'
            ? [{ icon: 'create-outline', onPress: handleEnterUpdateMode, color: Colors.primary }]
            : []
        }
      />

      {/* Mode banner */}
      {mode === 'update' ? (
        <View style={styles.updateBanner}>
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.updateBannerText}>
            Quick Stock Addition — enter amount to add (+) then tap Save
          </Text>
        </View>
      ) : (
        lowStockItems.length > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.alertBannerText}>
              {lowStockItems.length} ingredient{lowStockItems.length !== 1 ? 's' : ''} need restocking
            </Text>
          </View>
        )
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {displayItems.length === 0 && mode === 'view' ? (
            /* ── All good state ── */
            <View style={styles.allGoodCard}>
              <View style={styles.allGoodIcon}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              </View>
              <Text style={styles.allGoodTitle}>All Stock Levels OK</Text>
              <Text style={styles.allGoodDesc}>
                No ingredients are critically low. Tap the edit icon to manually add stock levels.
              </Text>
              <TouchableOpacity style={styles.updateStockBtn} onPress={handleEnterUpdateMode} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={16} color={Colors.white} />
                <Text style={styles.updateStockBtnText}>Add Stock</Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayItems.map((ing) => {
              const severity = getSeverity(ing);
              const color = severityColor(severity);
              const icon = severityIcon(severity);
              const entry = getEntry(ing.id);
              const unit = unitLabel(ing);
              const addedQty = parseFloat(entry?.value ?? '0') || 0;

              return (
                <View key={ing.id} style={[styles.card, mode === 'update' && styles.cardUpdateMode]}>
                  {/* Left: severity indicator */}
                  <View style={[styles.severityBar, { backgroundColor: color }]} />

                  <View style={styles.cardBody}>
                    {/* Header row */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ingName}>{ing.name}</Text>
                        <Text style={styles.ingType}>{ing.type}</Text>
                      </View>
                      <Ionicons name={icon} size={20} color={color} />
                    </View>

                    {/* Stock row */}
                    <View style={styles.stockRow}>
                      <View style={styles.stockInfo}>
                        <Text style={styles.stockLabel}>Current Stock</Text>
                        {mode === 'view' ? (
                          <Text style={[styles.stockValue, { color }]}>
                            {ing.stock.toLocaleString()} {unit}
                          </Text>
                        ) : (
                          /* ── Inline stock editor ── */
                          <View style={styles.stockInputRow}>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => {
                                const cur = parseFloat(entry?.value ?? '0') || 0;
                                setEntry(ing.id, String(Math.max(0, cur - 1)));
                              }}
                            >
                              <Ionicons name="remove" size={16} color={Colors.text} />
                            </TouchableOpacity>

                            <TextInput
                              style={styles.stockInput}
                              value={entry?.value ?? '0'}
                              onChangeText={(v) => setEntry(ing.id, v)}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                            />

                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => {
                                const cur = parseFloat(entry?.value ?? '0') || 0;
                                setEntry(ing.id, String(cur + 1));
                              }}
                            >
                              <Ionicons name="add" size={16} color={Colors.text} />
                            </TouchableOpacity>

                            <Text style={styles.unitLabel}>{unit}</Text>
                          </View>
                        )}
                      </View>

                      {/* Threshold */}
                      {ing.lowStockThreshold !== undefined && (
                        <View style={styles.thresholdBadge}>
                          <Text style={styles.thresholdText}>
                            Threshold: {ing.lowStockThreshold} {unit}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Severity label */}
                    {mode === 'view' && (
                      <View style={[styles.severityBadge, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.severityText, { color }]}>
                          {severity === 'critical' ? '⚠ Out of stock — restock immediately' : '↓ Low stock — running low'}
                        </Text>
                      </View>
                    )}

                    {/* Delta preview in update mode */}
                    {mode === 'update' && addedQty > 0 && (
                      <Text style={[styles.deltaPreview, { color: Colors.success }]}>
                        +{addedQty.toLocaleString()} {unit} to be added (New Stock: {(ing.stock + addedQty).toLocaleString()} {unit})
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* Save button in update mode */}
          {mode === 'update' && (
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelUpdate}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, changedCount === 0 && styles.saveBtnDisabled]}
                onPress={() => changedCount > 0 && setConfirmVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={Colors.white} />
                <Text style={styles.saveBtnText}>
                  Save {changedCount > 0 ? `(${changedCount} change${changedCount !== 1 ? 's' : ''})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirm save popup */}
      <Popup
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        icon="save-outline"
        iconColor={Colors.success}
        title="Confirm Stock Addition"
        description={`You are about to add stock to ${changedCount} ingredient${changedCount !== 1 ? 's' : ''}. This will be logged as manual adjustments.`}
        actions={[
          { label: 'Add Stock', variant: 'success', icon: 'checkmark-done-outline', onPress: handleSave },
          { label: 'Keep Editing', variant: 'ghost', onPress: () => setConfirmVisible(false) },
        ]}
      />

      {/* Saved confirmation */}
      <Popup
        visible={savedVisible}
        onClose={() => setSavedVisible(false)}
        icon="checkmark-circle-outline"
        iconColor={Colors.success}
        title="Stock Updated!"
        description="Ingredients stock levels have been incremented and logged."
        actions={[
          { label: 'Done', variant: 'primary', onPress: () => setSavedVisible(false) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },

  // Banners
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error + '15',
    borderBottomWidth: 1,
    borderBottomColor: Colors.error + '30',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  alertBannerText: { color: Colors.error, fontSize: Typography.sm, fontWeight: '600' },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '12',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '25',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  updateBannerText: { color: Colors.primary, fontSize: Typography.sm, fontWeight: '600' },

  // All-good empty state
  allGoodCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.xxl,
  },
  allGoodIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allGoodTitle: { color: Colors.text, fontSize: Typography.xl, fontWeight: '800' },
  allGoodDesc: { color: Colors.textMuted, fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  updateStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  updateStockBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.md },

  // Ingredient card
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  cardUpdateMode: {
    borderColor: Colors.primary + '40',
  },
  severityBar: { width: 4 },
  cardBody: { flex: 1, padding: Spacing.md, gap: Spacing.sm },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  ingName: { color: Colors.text, fontSize: Typography.md, fontWeight: '700' },
  ingType: { color: Colors.textMuted, fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },

  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm },
  stockInfo: { gap: 4 },
  stockLabel: { color: Colors.textMuted, fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  stockValue: { fontSize: Typography.xl, fontWeight: '800' },

  // Inline stock editor
  stockInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    marginTop: 2,
  },
  qtyBtn: {
    padding: Spacing.sm,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockInput: {
    color: Colors.text,
    fontSize: Typography.lg,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  unitLabel: { color: Colors.textMuted, fontSize: Typography.sm, paddingRight: Spacing.sm },

  thresholdBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  thresholdText: { color: Colors.textMuted, fontSize: 10 },

  severityBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  severityText: { fontSize: 11, fontWeight: '600' },

  deltaPreview: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },

  // Save/cancel row
  saveRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: Typography.md },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.md },
});
