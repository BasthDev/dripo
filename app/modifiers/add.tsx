import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { usePosStore } from '../../store/usePosStore';

export default function AddModifierScreen() {
  const router = useRouter();
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

  const handleAddAdjustment = () => {
    const qty = parseFloat(pickQty);
    if (!pickIngredientId || isNaN(qty) || qty === 0) return;
    setAdjustments(prev => {
      const existing = prev.find(a => a.ingredientId === pickIngredientId);
      if (existing) {
        return prev.map(a =>
          a.ingredientId === pickIngredientId
            ? { ...a, quantityDelta: a.quantityDelta + qty }
            : a
        );
      }
      return [...prev, { ingredientId: pickIngredientId, quantityDelta: qty }];
    });
    setPopupOpen(false);
    setPickIngredientId('');
    setPickQty('');
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
                  onPress: () => {
                    if (isModifierInUse(id)) {
                      Alert.alert(
                        'Cannot Delete',
                        'This modifier is assigned to one or more products.'
                      );
                      return;
                    }
                    Alert.alert('Delete Modifier', 'Are you sure?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          deleteModifier(id);
                          router.back();
                        },
                      },
                    ]);
                  },
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
              const u = ing
                ? ing.type === 'WEIGHT'
                  ? 'g'
                  : ing.type === 'VOLUME'
                    ? 'ml'
                    : 'pcs'
                : '?';
              return (
                <View key={idx} style={styles.adjRow}>
                  <Text style={styles.adjName}>{ing?.name ?? 'Unknown'}</Text>
                  <Text style={styles.adjQty}>
                    {adj.quantityDelta > 0 ? '+' : ''}
                    {adj.quantityDelta} {u}
                  </Text>
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
        <InputField
          label="Quantity change (+/-)"
          placeholder="e.g. 18 for extra espresso"
          keyboardType="numeric"
          value={pickQty}
          onChangeText={setPickQty}
          containerStyle={{ marginTop: Spacing.md }}
        />
      </Popup>
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
});
