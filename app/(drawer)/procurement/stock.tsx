import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import IngredientProcurementLineFields from '../../../components/ingredients/IngredientProcurementLineFields';
import {
  Button,
  Colors,
  DocumentBadge,
  Dropdown,
  DropdownOption,
  Header,
  InputField,
  Radius,
  SearchBar,
  Spacing,
  Typography,
} from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';
import {
  defaultIngredientLineInput,
  formatCostPerUnit,
  formatStockDisplay,
  resolveIngredientLine,
  type IngredientLineInputState,
} from '../../../utils/ingredientCost';

export default function ReceiveStockScreen() {
  const router = useRouter();
  const { showMessage, AppPopup } = useAppPopup();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const ingredients = usePosStore(s => s.ingredients);
  const suppliers = usePosStore(s => s.suppliers);
  const createStockIn = usePosStore(s => s.createStockIn);

  const [searchQ, setSearchQ] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [note, setNote] = useState('');
  const [recordExpense, setRecordExpense] = useState(true);
  const [lineInputs, setLineInputs] = useState<Record<string, IngredientLineInputState>>({});
  const [documentNo] = useState(() => usePosStore.getState().nextStockInDocumentNo());

  const getLineInput = (ingredientId: string) => {
    const ing = ingredients.find(i => i.id === ingredientId);
    if (!ing) return defaultIngredientLineInput({ type: 'QUANTITY', costPerUnit: 0 });
    return lineInputs[ingredientId] ?? defaultIngredientLineInput(ing);
  };

  useEffect(() => {
    if (!focus) return;
    const ing = ingredients.find(i => i.id === focus);
    if (!ing) return;
    setLineInputs(prev => ({
      ...prev,
      [ing.id]: prev[ing.id] ?? defaultIngredientLineInput(ing),
    }));
  }, [focus, ingredients]);

  const filtered = useMemo(
    () => ingredients.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase())),
    [ingredients, searchQ]
  );

  const supplierOptions: DropdownOption[] = [
    { label: 'No supplier', value: '', icon: 'remove-outline' },
    ...suppliers.map(s => ({ label: s.name, value: s.id, icon: 'business-outline' as const })),
  ];

  const receiveLines = useMemo(() => {
    return ingredients
      .map(ing => {
        const state = lineInputs[ing.id];
        if (!state) return null;
        const resolved = resolveIngredientLine(state, ing.type);
        if (!resolved) return null;
        return {
          ingredientId: ing.id,
          quantity: resolved.baseQty,
          unitCost: resolved.unitCost,
        };
      })
      .filter(Boolean) as { ingredientId: string; quantity: number; unitCost: number }[];
  }, [ingredients, lineInputs]);

  const receiveTotal = receiveLines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const submit = () => {
    if (!receiveLines.length) {
      showMessage({
        title: 'Enter quantities',
        description: 'Fill qty and price for at least one ingredient.',
        icon: 'alert-circle-outline',
      });
      return;
    }
    const id = createStockIn({
      lines: receiveLines,
      supplierId: supplierId || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      note: note.trim() || undefined,
      recordExpense,
    });
    if (!id) {
      showMessage({
        title: 'Failed',
        description: 'Could not save. Check ingredient data.',
        icon: 'alert-circle-outline',
      });
      return;
    }
    router.replace('/procurement/purchases?tab=received');
  };

  return (
    <View style={styles.container}>
      <Header title="Receive Stock" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Enter qty in kg, L, or pcs. For price, use package totals (e.g. 1 L @ Rp 25,000) — we
          calculate cost per g/ml automatically.
        </Text>

        <DocumentBadge label="SI No." documentNo={documentNo} variant="si" />

        <Dropdown
          label="Supplier"
          options={supplierOptions}
          value={supplierId}
          onChange={opt => setSupplierId(opt.value)}
          placeholder="Optional"
        />

        <InputField
          label="Invoice / reference no."
          value={invoiceNo}
          onChangeText={setInvoiceNo}
          placeholder="Optional"
        />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Record as COGS expense</Text>
            <Text style={styles.toggleDesc}>Shows in expense reports</Text>
          </View>
          <Switch
            value={recordExpense}
            onValueChange={setRecordExpense}
            trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
          />
        </View>

        <Text style={styles.section}>ITEMS RECEIVED</Text>
        <SearchBar
          value={searchQ}
          onChangeText={setSearchQ}
          placeholder="Search ingredients..."
        />

        {filtered.map(item => (
          <View
            key={item.id}
            style={[styles.row, focus === item.id && styles.rowFocus]}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              Stock: {formatStockDisplay(item.stock, item.type)} ·{' '}
              {formatCostPerUnit(item.costPerUnit, item.type)}
            </Text>
            <IngredientProcurementLineFields
              ingredient={item}
              value={getLineInput(item.id)}
              onChange={v => setLineInputs(p => ({ ...p, [item.id]: v }))}
              compact
            />
          </View>
        ))}

        <InputField label="Note" value={note} onChangeText={setNote} placeholder="Optional" />

        {receiveTotal > 0 ? (
          <Text style={styles.total}>Total: Rp {receiveTotal.toLocaleString()}</Text>
        ) : null}

        <Button
          label={`Post receive (${receiveLines.length})`}
          variant="primary"
          iconLeft="checkmark-circle-outline"
          onPress={submit}
          disabled={!receiveLines.length}
        />
      </ScrollView>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 48 },
  intro: { color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
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
  toggleLabel: { color: Colors.text, fontWeight: '600' },
  toggleDesc: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  section: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  row: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  rowFocus: { borderColor: Colors.primary, borderWidth: 2 },
  name: { color: Colors.text, fontWeight: '700', fontSize: Typography.md },
  meta: { color: Colors.textMuted, fontSize: Typography.xs },
  total: {
    color: Colors.primary,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: Typography.lg,
  },
});
