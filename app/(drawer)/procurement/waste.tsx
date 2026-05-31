import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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

export default function WasteScreen() {
  const router = useRouter();
  const { showMessage, AppPopup } = useAppPopup();
  const ingredients = usePosStore(s => s.ingredients);
  const recordWaste = usePosStore(s => s.recordWaste);

  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const selected = ingredients.find(i => i.id === ingredientId);
  const unit =
    selected?.type === 'WEIGHT'
      ? 'g'
      : selected?.type === 'VOLUME'
        ? 'ml'
        : 'pcs';

  const options: DropdownOption[] = ingredients.map(i => ({
    label: `${i.name} (stock: ${i.stock})`,
    value: i.id,
    icon: 'cube-outline',
  }));

  const submit = () => {
    const qty = parseFloat(quantity);
    if (!ingredientId || isNaN(qty) || qty <= 0) return;
    if (selected && qty > selected.stock) {
      showMessage({
        title: 'Insufficient stock',
        description: `Only ${selected.stock} ${unit} available.`,
        icon: 'alert-circle-outline',
      });
      return;
    }
    recordWaste({
      ingredientId,
      quantity: qty,
      note: note.trim() || undefined,
    });
    showMessage({
      title: 'Recorded',
      description: 'Waste posted to inventory ledger.',
      onConfirm: () => router.back(),
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Waste / Spoilage" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Reduces stock with movement reason WASTE — separate from sales and opname.
        </Text>
        <Dropdown
          label="Ingredient"
          options={options}
          value={ingredientId}
          onChange={opt => setIngredientId(opt.value)}
          placeholder="Select..."
        />
        <InputField
          label={`Quantity (${unit})`}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />
        <InputField label="Reason / note" value={note} onChangeText={setNote} />
        <Button label="Post waste" variant="danger" onPress={submit} disabled={!ingredientId || !quantity} />
      </ScrollView>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  hint: { color: Colors.textSecondary, fontSize: Typography.sm },
});
