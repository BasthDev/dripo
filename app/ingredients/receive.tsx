import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Colors,
  Dropdown,
  DropdownOption,
  Header,
  InputField,
  Radius,
  Spacing,
  Typography,
} from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';

export default function ReceiveStockScreen() {
  const router = useRouter();
  const { id: preselectedId } = useLocalSearchParams<{ id?: string }>();
  const ingredients = usePosStore(s => s.ingredients);
  const receiveStock = usePosStore(s => s.receiveStock);

  const [ingredientId, setIngredientId] = useState(preselectedId ?? '');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [note, setNote] = useState('');
  const [recordExpense, setRecordExpense] = useState(true);

  const selected = ingredients.find(i => i.id === ingredientId);
  const unitLabel = selected
    ? selected.type === 'WEIGHT'
      ? 'g'
      : selected.type === 'VOLUME'
        ? 'ml'
        : 'pcs'
    : '';

  const options: DropdownOption[] = ingredients.map(i => ({
    label: i.name,
    value: i.id,
    icon: 'cube-outline',
  }));

  const handleIngredientChange = (val: string) => {
    setIngredientId(val);
    const ing = ingredients.find(i => i.id === val);
    if (ing) setUnitCost(ing.costPerUnit.toString());
  };

  const handleSubmit = () => {
    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);
    if (!ingredientId || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) return;

    receiveStock({
      ingredientId,
      quantity: qty,
      unitCost: cost,
      note: note.trim() || undefined,
      recordExpense,
    });
    router.back();
  };

  const qtyN = parseFloat(quantity) || 0;
  const costN = parseFloat(unitCost) || 0;
  const totalCost = qtyN * costN;

  return (
    <View style={styles.container}>
      <Header title="Receive Stock" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Add purchased stock and update cost per unit. Optionally record as an expense.
        </Text>

        <Dropdown
          label="Ingredient"
          placeholder="Select ingredient..."
          options={options}
          value={ingredientId}
          onChange={opt => handleIngredientChange(opt.value)}
        />

        <InputField
          label={`Quantity received (${unitLabel || 'units'})`}
          placeholder="0"
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />

        <InputField
          label={`Purchase price per ${unitLabel || 'unit'} (Rp)`}
          placeholder="0"
          keyboardType="numeric"
          value={unitCost}
          onChangeText={setUnitCost}
          hint="Updates ingredient cost for HPP calculations"
        />

        <InputField
          label="Note (optional)"
          placeholder="Supplier, invoice #..."
          value={note}
          onChangeText={setNote}
        />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Record as expense</Text>
            <Text style={styles.toggleDesc}>
              Saves qty × unit cost to expense history
            </Text>
          </View>
          <Switch
            value={recordExpense}
            onValueChange={setRecordExpense}
            trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
          />
        </View>

        {totalCost > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Purchase total</Text>
            <Text style={styles.summaryValue}>Rp {totalCost.toLocaleString()}</Text>
          </View>
        )}

        <Button
          label="Receive Stock"
          variant="primary"
          iconLeft="download-outline"
          onPress={handleSubmit}
          disabled={!ingredientId || !quantity || !unitCost}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 40 },
  hint: { color: Colors.textSecondary, fontSize: Typography.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  toggleLabel: { color: Colors.text, fontWeight: '600', fontSize: Typography.md },
  toggleDesc: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  summary: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  summaryLabel: { color: Colors.textSecondary, fontSize: Typography.sm },
  summaryValue: { color: Colors.primary, fontSize: Typography.xxl, fontWeight: '800', marginTop: 4 },
});
