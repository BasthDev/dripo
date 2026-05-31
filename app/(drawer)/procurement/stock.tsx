import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { ingredientUnit } from '../../../utils/ingredientUnits';

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
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveCost, setReceiveCost] = useState<Record<string, string>>({});
  const [documentNo] = useState(() => usePosStore.getState().nextStockInDocumentNo());

  useEffect(() => {
    if (!focus) return;
    const ing = ingredients.find(i => i.id === focus);
    if (ing) {
      setReceiveCost(prev => ({
        ...prev,
        [ing.id]: prev[ing.id] ?? String(ing.costPerUnit),
      }));
    }
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
        const qty = parseFloat(receiveQty[ing.id] ?? '');
        const cost = parseFloat(receiveCost[ing.id] ?? String(ing.costPerUnit));
        if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) return null;
        return { ingredientId: ing.id, quantity: qty, unitCost: cost };
      })
      .filter(Boolean) as { ingredientId: string; quantity: number; unitCost: number }[];
  }, [ingredients, receiveQty, receiveCost]);

  const receiveTotal = receiveLines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const submit = () => {
    if (!receiveLines.length) {
      showMessage({
        title: 'Enter quantities',
        description: 'Fill qty received for at least one ingredient.',
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

        {filtered.map(item => {
          const unit = ingredientUnit(item.type);
          return (
            <View
              key={item.id}
              style={[styles.row, focus === item.id && styles.rowFocus]}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  Stock: {item.stock} {unit} · Rp {item.costPerUnit}/{unit}
                </Text>
              </View>
              <View style={styles.inputsCol}>
                <Text style={styles.inputLabel}>Qty ({unit})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={receiveQty[item.id] ?? ''}
                  onChangeText={v => setReceiveQty(p => ({ ...p, [item.id]: v }))}
                />
                <Text style={styles.inputLabel}>Rp/{unit}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={receiveCost[item.id] ?? String(item.costPerUnit)}
                  onChangeText={v => setReceiveCost(p => ({ ...p, [item.id]: v }))}
                />
              </View>
            </View>
          );
        })}

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  rowFocus: { borderColor: Colors.primary, borderWidth: 2 },
  rowLeft: { flex: 1 },
  name: { color: Colors.text, fontWeight: '600', fontSize: Typography.sm },
  meta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  inputsCol: { alignItems: 'flex-end', gap: 2 },
  inputLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '600' },
  input: {
    width: 76,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.sm,
    padding: 6,
    textAlign: 'center',
    fontSize: 12,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  total: {
    color: Colors.primary,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: Typography.lg,
  },
});
