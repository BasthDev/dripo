import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Colors,
  Dropdown,
  DropdownOption,
  Header,
  InputField,
  Spacing,
} from '../../../components/ui';
import { OperatingExpenseType, usePosStore } from '../../../store/usePosStore';
import { OPERATING_EXPENSE_LABELS } from '../../../utils/inventoryLabels';

const TYPE_OPTIONS: DropdownOption[] = (
  Object.entries(OPERATING_EXPENSE_LABELS) as [OperatingExpenseType, string][]
).map(([value, label]) => ({
  value,
  label,
  icon: 'wallet-outline' as const,
}));

export default function OperatingExpenseScreen() {
  const router = useRouter();
  const addOperatingExpense = usePosStore(s => s.addOperatingExpense);

  const [title, setTitle] = useState('');
  const [operatingType, setOperatingType] = useState<OperatingExpenseType>('OTHER');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    const total = parseFloat(amount);
    if (!title.trim() || isNaN(total) || total <= 0) return;
    addOperatingExpense({
      title: title.trim(),
      operatingType,
      totalAmount: total,
      note: note.trim() || undefined,
    });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Header title="Operating Expense" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <InputField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. May rent"
        />
        <Dropdown
          label="Category"
          options={TYPE_OPTIONS}
          value={operatingType}
          onChange={opt => setOperatingType(opt.value as OperatingExpenseType)}
        />
        <InputField
          label="Amount (Rp)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <InputField label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
        <Button
          label="Save expense"
          variant="primary"
          onPress={submit}
          disabled={!title.trim() || !amount}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 40 },
});
