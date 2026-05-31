import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import IngredientQtyInput, { defaultQtyForType } from '../../../components/ingredients/IngredientQtyInput';
import {
  Button,
  Colors,
  Dropdown,
  DropdownOption,
  Header,
  InputField,
  Spacing,
  Typography,
} from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';
import {
  formatStockDisplay,
  fromBaseAmount,
  toBaseAmount,
  type DisplayUnit,
} from '../../../utils/ingredientCost';

export default function WasteScreen() {
  const router = useRouter();
  const { showMessage, AppPopup } = useAppPopup();
  const ingredients = usePosStore(s => s.ingredients);
  const recordWaste = usePosStore(s => s.recordWaste);

  const [ingredientId, setIngredientId] = useState('');
  const [qtyAmount, setQtyAmount] = useState('');
  const [qtyUnit, setQtyUnit] = useState<DisplayUnit>('g');
  const [note, setNote] = useState('');

  const selected = ingredients.find(i => i.id === ingredientId);

  useEffect(() => {
    if (selected) {
      setQtyUnit(defaultQtyForType(selected.type));
    }
  }, [selected?.id, selected?.type]);

  const options: DropdownOption[] = ingredients.map(i => ({
    label: `${i.name} (stock: ${formatStockDisplay(i.stock, i.type)})`,
    value: i.id,
    icon: 'cube-outline',
  }));

  const submit = () => {
    if (!selected) return;
    const amt = parseFloat(qtyAmount);
    if (isNaN(amt) || amt <= 0) return;
    const baseQty = toBaseAmount(amt, qtyUnit);
    if (baseQty > selected.stock) {
      showMessage({
        title: 'Insufficient stock',
        description: `Only ${formatStockDisplay(selected.stock, selected.type)} available.`,
        icon: 'alert-circle-outline',
      });
      return;
    }
    recordWaste({
      ingredientId,
      quantity: baseQty,
      note: note.trim() || undefined,
    });
    showMessage({
      title: 'Recorded',
      description: 'Waste posted to inventory ledger.',
    });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Header title="Waste / Spoilage" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Reduces stock with movement reason WASTE. Enter amount in kg, L, or pcs.
        </Text>
        <Dropdown
          label="Ingredient"
          options={options}
          value={ingredientId}
          onChange={opt => setIngredientId(opt.value)}
          placeholder="Select..."
        />
        {selected ? (
          <IngredientQtyInput
            type={selected.type}
            amount={qtyAmount}
            unit={qtyUnit}
            onAmountChange={setQtyAmount}
            onUnitChange={setQtyUnit}
            label="Quantity wasted"
          />
        ) : null}
        <InputField label="Reason / note" value={note} onChangeText={setNote} />
        <Button
          label="Post waste"
          variant="danger"
          onPress={submit}
          disabled={!ingredientId || !qtyAmount}
        />
      </ScrollView>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  hint: { color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
});
