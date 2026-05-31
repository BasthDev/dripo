import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Button,
  Colors,
  Dropdown,
  DropdownOption,
  DocumentBadge,
  Header,
  InputField,
  Radius,
  Spacing,
  Typography,
} from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import { ingredientUnit } from '../../../utils/ingredientUnits';

type LineDraft = {
  key: string;
  ingredientId: string;
  quantity: string;
  unitCost: string;
};

export default function PurchaseOrderCreateScreen() {
  const router = useRouter();
  const ingredients = usePosStore(s => s.ingredients);
  const suppliers = usePosStore(s => s.suppliers);
  const createPurchaseOrder = usePosStore(s => s.createPurchaseOrder);

  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([
    { key: '1', ingredientId: '', quantity: '', unitCost: '' },
  ]);
  const [documentNo] = useState(() =>
    usePosStore.getState().nextPurchaseOrderDocumentNo()
  );

  const ingredientOptions: DropdownOption[] = ingredients.map(i => ({
    label: i.name,
    value: i.id,
    icon: 'cube-outline',
  }));

  const supplierOptions: DropdownOption[] = [
    { label: 'No supplier', value: '', icon: 'remove-outline' },
    ...suppliers.map(s => ({ label: s.name, value: s.id, icon: 'business-outline' as const })),
  ];

  const parsedLines = useMemo(
    () =>
      lines
        .map(l => ({
          ingredientId: l.ingredientId,
          quantity: parseFloat(l.quantity),
          unitCost: parseFloat(l.unitCost),
        }))
        .filter(
          l =>
            l.ingredientId &&
            !isNaN(l.quantity) &&
            l.quantity > 0 &&
            !isNaN(l.unitCost) &&
            l.unitCost >= 0
        ),
    [lines]
  );

  const total = parsedLines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const submit = () => {
    if (!parsedLines.length) return;
    createPurchaseOrder({
      lines: parsedLines,
      supplierId: supplierId || undefined,
      note: note.trim() || undefined,
    });
    router.replace('/procurement/purchases?tab=orders');
  };

  return (
    <View style={styles.container}>
      <Header title="New Purchase Order" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <DocumentBadge label="PO No." documentNo={documentNo} variant="po" />

        <Dropdown
          label="Supplier"
          options={supplierOptions}
          value={supplierId}
          onChange={opt => setSupplierId(opt.value)}
          placeholder="Select..."
        />

        {lines.map((line, index) => {
          const ing = ingredients.find(i => i.id === line.ingredientId);
          const unit = ing ? ingredientUnit(ing.type) : '';
          return (
            <View key={line.key} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineTitle}>Line {index + 1}</Text>
                {lines.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => setLines(prev => prev.filter(l => l.key !== line.key))}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Dropdown
                label="Ingredient"
                options={ingredientOptions}
                value={line.ingredientId}
                onChange={opt =>
                  setLines(prev =>
                    prev.map(l =>
                      l.key === line.key ? { ...l, ingredientId: opt.value } : l
                    )
                  )
                }
                placeholder="Select..."
              />
              {ing ? (
                <Text style={styles.unitHint}>
                  Unit: {unit} ({ing.type === 'WEIGHT' ? 'weight' : ing.type === 'VOLUME' ? 'volume' : 'pieces'})
                </Text>
              ) : null}
              <InputField
                label={unit ? `Quantity (${unit})` : 'Quantity'}
                keyboardType="numeric"
                value={line.quantity}
                onChangeText={v =>
                  setLines(prev =>
                    prev.map(l => (l.key === line.key ? { ...l, quantity: v } : l))
                  )
                }
              />
              <InputField
                label={unit ? `Price per ${unit} (Rp)` : 'Unit cost (Rp)'}
                keyboardType="numeric"
                value={line.unitCost}
                onChangeText={v =>
                  setLines(prev =>
                    prev.map(l => (l.key === line.key ? { ...l, unitCost: v } : l))
                  )
                }
              />
            </View>
          );
        })}

        <Button
          label="Add line"
          variant="outline"
          iconLeft="add"
          onPress={() =>
            setLines(prev => [
              ...prev,
              { key: String(Date.now()), ingredientId: '', quantity: '', unitCost: '' },
            ])
          }
        />

        <InputField label="Note" value={note} onChangeText={setNote} />

        {total > 0 ? (
          <Text style={styles.total}>Total: Rp {total.toLocaleString()}</Text>
        ) : null}

        <Button
          label="Save draft PO"
          variant="primary"
          onPress={submit}
          disabled={!parsedLines.length}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 48 },
  lineCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  lineTitle: { fontWeight: '700', color: Colors.text },
  unitHint: { color: Colors.textMuted, fontSize: Typography.xs, marginBottom: Spacing.xs },
  total: { color: Colors.primary, fontWeight: '800', textAlign: 'center', fontSize: Typography.lg },
});
