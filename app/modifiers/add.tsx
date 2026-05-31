import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    Button,
    Colors,
    Dropdown,
    DropdownOption,
    Header,
    InputField,
    Popup,
    Radius,
    Spacing,
    Typography,
} from '../../components/ui';
import { useAppPopup } from '../../hooks/useAppPopup';
import IngredientQtyInput, { defaultQtyForType } from '../../components/ingredients/IngredientQtyInput';
import { usePosStore } from '../../store/usePosStore';
import {
  formatRecipeQuantity,
  toBaseAmount,
  type DisplayUnit,
} from '../../utils/ingredientCost';

export default function AddModifierScreen() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const modifiers = usePosStore(s => s.modifiers);
  const ingredients = usePosStore(s => s.ingredients);
  const addModifier = usePosStore(s => s.addModifier);
  const updateModifier = usePosStore(s => s.updateModifier);
  const deleteModifier = usePosStore(s => s.deleteModifier);
  const isModifierInUse = usePosStore(s => s.isModifierInUse);

  const [name, setName] = useState('');
  const [sellPriceDelta, setSellPriceDelta] = useState('0');
  const [adjustments, setAdjustments] = useState<
    { ingredientId: string; quantityDelta: number }[]
  >([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [pickIngredientId, setPickIngredientId] = useState('');
  const [pickQty, setPickQty] = useState('');
  const [pickUnit, setPickUnit] = useState<DisplayUnit>('g');
  const [pickSign, setPickSign] = useState<'+' | '-'>('+');

  useEffect(() => {
    if (id) {
      const existing = modifiers.find(m => m.id === id);
      if (existing) {
        setName(existing.name);
        setSellPriceDelta(String(existing.sellPriceDelta));
        setAdjustments(existing.recipeAdjustments);
      }
    }
  }, [id, modifiers]);

  const ingredientOptions: DropdownOption[] = ingredients.map(i => ({
    label: i.name,
    value: i.id,
    icon: 'cube-outline',
  }));

  const pickIngredient = ingredients.find(i => i.id === pickIngredientId);

  useEffect(() => {
    if (pickIngredient) setPickUnit(defaultQtyForType(pickIngredient.type));
  }, [pickIngredient?.id, pickIngredient?.type]);

  const handleAddAdjustment = () => {
    const qty = parseFloat(pickQty);
    if (!pickIngredientId || !pickIngredient || isNaN(qty) || qty === 0) return;
    const baseDelta =
      toBaseAmount(Math.abs(qty), pickUnit) * (pickSign === '-' ? -1 : 1);
    if (baseDelta === 0) return;
    setAdjustments(prev => {
      const existing = prev.find(a => a.ingredientId === pickIngredientId);
      if (existing) {
        return prev.map(a =>
          a.ingredientId === pickIngredientId
            ? { ...a, quantityDelta: a.quantityDelta + baseDelta }
            : a
        );
      }
      return [...prev, { ingredientId: pickIngredientId, quantityDelta: baseDelta }];
    });
    setPopupOpen(false);
    setPickIngredientId('');
    setPickQty('');
    setPickSign('+');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const delta = parseFloat(sellPriceDelta);
    if (isNaN(delta)) return;

    const payload = {
      name: name.trim(),
      sellPriceDelta: delta,
      recipeAdjustments: adjustments,
    };

    if (id) {
      updateModifier(id, payload);
    } else {
      addModifier(payload);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    if (isModifierInUse(id)) {
      showMessage({
        title: 'Cannot Delete',
        description: 'This modifier is assigned to one or more products.',
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
      return;
    }
    showConfirm({
      title: 'Delete Modifier',
      description: 'Are you sure?',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        deleteModifier(id);
        router.back();
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title={id ? 'Edit Modifier' : 'New Modifier'}
        onBack={() => router.back()}
        actions={
          id
            ? [
                {
                  icon: 'trash-outline' as const,
                  color: Colors.error,
                  onPress: handleDelete,
                },
              ]
            : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Modifiers add extra charge and optional ingredient usage (e.g. Extra Shot).
        </Text>

        <InputField
          label="Modifier Name"
          placeholder="e.g. Extra Shot"
          value={name}
          onChangeText={setName}
        />

        <InputField
          label="Extra charge (Rp)"
          placeholder="0"
          keyboardType="numeric"
          value={sellPriceDelta}
          onChangeText={setSellPriceDelta}
          hint="Added to product sell price when selected"
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredient adjustments</Text>
            <TouchableOpacity onPress={() => setPopupOpen(true)}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {adjustments.length === 0 ? (
            <Text style={styles.emptyText}>No ingredient changes — price-only modifier.</Text>
          ) : (
            adjustments.map((adj, idx) => {
              const ing = ingredients.find(i => i.id === adj.ingredientId);
              const sign = adj.quantityDelta > 0 ? '+' : '';
              const qtyLabel = ing
                ? `${sign}${formatRecipeQuantity(Math.abs(adj.quantityDelta), ing.type)}`
                : `${sign}${adj.quantityDelta}`;
              return (
                <View key={idx} style={styles.adjRow}>
                  <Text style={styles.adjName}>{ing?.name ?? 'Unknown'}</Text>
                  <Text style={styles.adjQty}>{qtyLabel}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setAdjustments(prev => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <Button
          label={id ? 'Save Changes' : 'Create Modifier'}
          variant="primary"
          iconLeft="save-outline"
          onPress={handleSave}
          disabled={!name.trim()}
        />
      </ScrollView>

      <Popup
        visible={popupOpen}
        onClose={() => setPopupOpen(false)}
        title="Ingredient adjustment"
        actions={[
          { label: 'Add', onPress: handleAddAdjustment, variant: 'primary' },
        ]}
      >
        <Dropdown
          label="Ingredient"
          options={ingredientOptions}
          value={pickIngredientId}
          onChange={opt => setPickIngredientId(opt.value)}
          placeholder="Select..."
        />
        {pickIngredient ? (
          <>
            <View style={styles.signRow}>
              <Text style={styles.signLabel}>Change</Text>
              <TouchableOpacity
                style={[styles.signBtn, pickSign === '+' && styles.signBtnActive]}
                onPress={() => setPickSign('+')}
              >
                <Text
                  style={[styles.signBtnText, pickSign === '+' && styles.signBtnTextActive]}
                >
                  Use more (+)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.signBtn, pickSign === '-' && styles.signBtnActive]}
                onPress={() => setPickSign('-')}
              >
                <Text
                  style={[styles.signBtnText, pickSign === '-' && styles.signBtnTextActive]}
                >
                  Use less (−)
                </Text>
              </TouchableOpacity>
            </View>
            <IngredientQtyInput
              type={pickIngredient.type}
              amount={pickQty}
              unit={pickUnit}
              onAmountChange={setPickQty}
              onUnitChange={setPickUnit}
              label="Amount"
              style={{ marginTop: Spacing.md }}
            />
          </>
        ) : null}
      </Popup>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 40 },
  hint: { color: Colors.textSecondary, fontSize: Typography.sm },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: Colors.text, fontWeight: '600', fontSize: Typography.md },
  addText: { color: Colors.primary, fontWeight: '600', fontSize: Typography.sm },
  emptyText: { color: Colors.textMuted, fontStyle: 'italic', fontSize: Typography.sm },
  adjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  adjName: { flex: 1, color: Colors.text, fontWeight: '500' },
  adjQty: { color: Colors.secondary, fontWeight: '700' },
  signRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  signLabel: { color: Colors.textMuted, fontSize: Typography.xs, fontWeight: '600', width: '100%' },
  signBtn: {
    flex: 1,
    minWidth: 120,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  signBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  signBtnText: { color: Colors.textMuted, fontSize: Typography.xs, fontWeight: '600' },
  signBtnTextActive: { color: Colors.primary },
});
