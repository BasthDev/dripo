import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
} from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';

export default function ManageTablesScreen() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const tableZones = usePosStore(s => s.tableZones);
  const diningTables = usePosStore(s => s.diningTables);
  const addTableZone = usePosStore(s => s.addTableZone);
  const removeTableZone = usePosStore(s => s.removeTableZone);
  const deleteDiningTable = usePosStore(s => s.deleteDiningTable);

  const [newZone, setNewZone] = useState('');
  const [tableBaseName, setTableBaseName] = useState('');
  const [tableCount, setTableCount] = useState('10');
  const [tableZone, setTableZone] = useState(tableZones[0] ?? '');

  const zoneOptions: DropdownOption[] = tableZones.map(z => ({
    label: z,
    value: z,
    icon: 'location-outline',
  }));

  const createTables = () => {
    const count = parseInt(tableCount, 10);
    if (!tableBaseName.trim() || !tableZone || !count || count < 1) return;

    const addBulk = usePosStore.getState().addDiningTablesBulk;
    if (!addBulk) {
      showMessage({
        title: 'Update required',
        description: 'Reload the app to use bulk table creation.',
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
      return;
    }

    const created = addBulk({
      baseName: tableBaseName.trim(),
      count,
      zone: tableZone,
    });

    if (created > 0) {
      showMessage({
        title: 'Tables created',
        description: `Added ${created} table(s) in ${tableZone}.`,
      });
    }
  };

  const previewNames = () => {
    const base = tableBaseName.trim();
    const count = Math.min(Math.max(parseInt(tableCount, 10) || 0, 1), 99);
    if (!base || count < 1) return '';
    const bulkName = (index: number) => {
      if (base.length <= 3 && !/\s/.test(base)) return `${base}${index}`;
      return `${base} ${index}`;
    };
    if (count <= 3) {
      return Array.from({ length: count }, (_, i) => bulkName(i + 1)).join(', ');
    }
    return `${bulkName(1)}, ${bulkName(2)}, … ${bulkName(count)}`;
  };

  return (
    <View style={styles.container}>
      <Header title="Manage tables" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>ZONES / AREAS</Text>
        <Text style={styles.hint}>
          e.g. Indoor, Outdoor, Floor 1 — used to filter the table grid.
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField
              label="New zone"
              value={newZone}
              onChangeText={setNewZone}
              placeholder="Floor 2"
            />
          </View>
          <Button
            label="Add"
            variant="outline"
            onPress={() => {
              if (newZone.trim()) {
                addTableZone(newZone);
                setNewZone('');
                setTableZone(newZone.trim());
              }
            }}
          />
        </View>
        <View style={styles.zoneTags}>
          {tableZones.map(z => (
            <View key={z} style={styles.tag}>
              <Text style={styles.tagText}>{z}</Text>
              {tableZones.length > 1 ? (
                <Text
                  style={styles.tagRemove}
                  onPress={() =>
                    showConfirm({
                      title: 'Remove zone',
                      description: `Remove "${z}"? Tables keep this zone label.`,
                      confirmLabel: 'Remove',
                      destructive: true,
                      onConfirm: () => removeTableZone(z),
                    })
                  }
                >
                  ×
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <Text style={[styles.section, { marginTop: Spacing.xl }]}>CREATE TABLES</Text>
        <Text style={styles.hint}>
          Enter a base name and how many tables to add. Example: name "T" × 20 → T1, T2 … T20.
          Name "Table" × 5 → Table 1, Table 2 … Table 5.
        </Text>
        <InputField
          label="Table name (base)"
          value={tableBaseName}
          onChangeText={setTableBaseName}
          placeholder="Table"
        />
        <InputField
          label="How many tables?"
          value={tableCount}
          onChangeText={setTableCount}
          placeholder="20"
          keyboardType="number-pad"
        />
        <Dropdown
          label="Location / zone"
          options={zoneOptions}
          value={tableZone}
          onChange={opt => setTableZone(opt.value)}
        />
        {previewNames() ? (
          <Text style={styles.preview}>Preview: {previewNames()}</Text>
        ) : null}
        <Button
          label="Create tables"
          variant="primary"
          iconLeft="add-circle-outline"
          onPress={createTables}
          disabled={!tableBaseName.trim() || !tableZone}
        />

        <Text style={[styles.section, { marginTop: Spacing.xl }]}>TABLES ({diningTables.length})</Text>
        {[...diningTables]
          .sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name))
          .map(item => (
            <View key={item.id} style={styles.tableRow}>
              <View>
                <Text style={styles.tableRowName}>{item.name}</Text>
                <Text style={styles.tableRowZone}>{item.zone}</Text>
              </View>
              <Button
                label="Delete"
                variant="danger"
                size="sm"
                onPress={() =>
                  showConfirm({
                    title: 'Delete table',
                    description: `Remove ${item.name}?`,
                    confirmLabel: 'Delete',
                    destructive: true,
                    onConfirm: () => deleteDiningTable(item.id),
                  })
                }
              />
            </View>
          ))}
      </ScrollView>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  section: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  hint: { color: Colors.textSecondary, fontSize: Typography.sm, marginBottom: Spacing.md },
  preview: {
    color: Colors.primary,
    fontSize: Typography.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  zoneTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tagText: { color: Colors.text, fontWeight: '600', fontSize: Typography.sm },
  tagRemove: { color: Colors.error, fontSize: 18, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
  },
  tableRowName: { color: Colors.text, fontWeight: '700' },
  tableRowZone: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
});
