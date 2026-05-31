import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
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

const REASON_OPTIONS: DropdownOption[] = [
  { label: 'Monthly physical count', value: 'Monthly physical count', icon: 'calendar-outline' },
  { label: 'Audit / spot check', value: 'Audit / spot check', icon: 'search-outline' },
  { label: 'Opening balance', value: 'Opening balance', icon: 'flag-outline' },
  { label: 'Found discrepancy', value: 'Found discrepancy', icon: 'alert-circle-outline' },
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal-outline' },
];

export default function StockOpnameScreen() {
  const router = useRouter();
  const { showMessage, AppPopup } = useAppPopup();
  const ingredients = usePosStore(s => s.ingredients);
  const stockOpnames = usePosStore(s => s.stockOpnames);
  const postStockOpname = usePosStore(s => s.postStockOpname);

  const [searchQ, setSearchQ] = useState('');
  const [reasonPreset, setReasonPreset] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [note, setNote] = useState('');
  const [countedQty, setCountedQty] = useState<Record<string, string>>({});
  const [documentNo] = useState(() => usePosStore.getState().nextStockOpnameDocumentNo());

  const filtered = useMemo(
    () => ingredients.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase())),
    [ingredients, searchQ]
  );

  const resolvedReason =
    reasonPreset === 'OTHER' ? reasonOther.trim() : reasonPreset;

  const countLines = useMemo(() => {
    return ingredients
      .map(ing => {
        const raw = countedQty[ing.id];
        if (raw === undefined || raw === '') return null;
        const qty = parseFloat(raw);
        if (isNaN(qty) || qty < 0 || qty === ing.stock) return null;
        return { ingredientId: ing.id, countedQty: qty };
      })
      .filter(Boolean) as { ingredientId: string; countedQty: number }[];
  }, [ingredients, countedQty]);

  const history = useMemo(
    () => [...stockOpnames].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [stockOpnames]
  );

  const submit = () => {
    if (!resolvedReason) {
      showMessage({
        title: 'Reason required',
        description: 'Select or enter why you are posting this count.',
        icon: 'alert-circle-outline',
      });
      return;
    }
    if (!countLines.length) {
      showMessage({
        title: 'No adjustments',
        description: 'Enter counted quantities that differ from system stock.',
        icon: 'alert-circle-outline',
      });
      return;
    }
    const id = postStockOpname({
      lines: countLines,
      reason: resolvedReason,
      note: note.trim() || undefined,
    });
    if (!id) {
      showMessage({
        title: 'Failed',
        description: 'Could not post stock opname.',
        icon: 'alert-circle-outline',
      });
      return;
    }
    setCountedQty({});
    setNote('');
    setReasonOther('');
    const doc = usePosStore.getState().stockOpnames.find(s => s.id === id);
    showMessage({
      title: 'Posted',
      description: `Document ${doc?.documentNo ?? documentNo} saved.`,
      onConfirm: () => router.back(),
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Stock Opname" subtitle="Physical count adjustment" />

      <ScrollView contentContainerStyle={styles.formScroll}>
        <DocumentBadge label="Opname No." documentNo={documentNo} variant="so" />

        <Dropdown
          label="Reason *"
          placeholder="Why are you counting?"
          options={REASON_OPTIONS}
          value={reasonPreset}
          onChange={opt => setReasonPreset(opt.value)}
        />
        {reasonPreset === 'OTHER' ? (
          <InputField
            label="Describe reason *"
            value={reasonOther}
            onChangeText={setReasonOther}
            placeholder="e.g. End of month closing"
          />
        ) : null}

        <InputField
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Optional details"
        />

        <Text style={styles.section}>COUNT ITEMS</Text>
      </ScrollView>

      <View style={styles.searchWrap}>
        <SearchBar
          value={searchQ}
          onChangeText={setSearchQ}
          placeholder="Search ingredients..."
        />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          history.length > 0 ? (
            <View style={styles.historyBlock}>
              <Text style={styles.historyTitle}>RECENT OPNAME</Text>
              {history.slice(0, 5).map(doc => (
                <View key={doc.id} style={styles.historyRow}>
                  <Text style={styles.historyDoc}>{doc.documentNo}</Text>
                  <Text style={styles.historyMeta} numberOfLines={2}>
                    {doc.reason}
                    {doc.note ? ` · ${doc.note}` : ''} ·{' '}
                    {new Date(doc.timestamp).toLocaleDateString()} ·{' '}
                    {doc.lines.filter(l => l.variance !== 0).length} adjusted
                  </Text>
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const unit = ingredientUnit(item.type);
          const counted = countedQty[item.id] ?? '';
          const countedN = parseFloat(counted);
          const variance =
            counted !== '' && !isNaN(countedN) ? countedN - item.stock : null;

          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  System: {item.stock} {unit}
                </Text>
                {variance !== null && variance !== 0 ? (
                  <Text
                    style={[
                      styles.variance,
                      { color: variance > 0 ? Colors.success : Colors.error },
                    ]}
                  >
                    Variance: {variance > 0 ? '+' : ''}
                    {variance} {unit}
                  </Text>
                ) : null}
              </View>
              <TextInput
                style={styles.input}
                placeholder={String(item.stock)}
                keyboardType="numeric"
                value={counted}
                onChangeText={v => setCountedQty(p => ({ ...p, [item.id]: v }))}
              />
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <Button
          label={`Post opname (${countLines.length})`}
          variant="primary"
          iconLeft="checkmark-circle-outline"
          onPress={submit}
          disabled={!countLines.length || !resolvedReason}
        />
      </View>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  formScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  section: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  searchWrap: { paddingHorizontal: Spacing.lg },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  historyBlock: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  historyTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  historyRow: { marginBottom: Spacing.sm },
  historyDoc: { color: Colors.warning, fontWeight: '800', fontSize: Typography.sm },
  historyMeta: { color: Colors.textSecondary, fontSize: Typography.xs, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  rowLeft: { flex: 1 },
  name: { color: Colors.text, fontWeight: '600' },
  meta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  variance: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  input: {
    width: 80,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    textAlign: 'center',
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
});
