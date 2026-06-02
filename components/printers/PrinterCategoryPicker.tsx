import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../ui';
import type { Category } from '../../store/usePosStore';

type Props = {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export default function PrinterCategoryPicker({
  categories,
  selectedIds,
  onChange,
}: Props) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const allSelected =
    categories.length > 0 && selectedIds.length === categories.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.hint}>
          Tap categories this printer should receive. Nothing prints until at least one is
          selected.
        </Text>
        {categories.length > 0 ? (
          <TouchableOpacity
            style={[styles.allBtn, allSelected && styles.allBtnActive]}
            onPress={() =>
              onChange(allSelected ? [] : categories.map(c => c.id))
            }
          >
            <Text style={[styles.allBtnText, allSelected && styles.allBtnTextActive]}>
              {allSelected ? 'Clear all' : 'Select all'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {categories.length === 0 ? (
        <Text style={styles.empty}>Add product categories in Products first.</Text>
      ) : (
        <View style={styles.chipGrid}>
          {categories.map(cat => {
            const on = selectedIds.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggle(cat.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{cat.name}</Text>
                {on ? (
                  <Text style={styles.check}>✓</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.count}>
        {selectedIds.length} of {categories.length} selected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  headerRow: { gap: Spacing.sm },
  hint: { color: Colors.textSecondary, fontSize: Typography.xs, lineHeight: 18 },
  allBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  allBtnActive: { backgroundColor: Colors.primary + '18' },
  allBtnText: { color: Colors.primary, fontWeight: '700', fontSize: Typography.xs },
  allBtnTextActive: { color: Colors.primary },
  empty: {
    color: Colors.textMuted,
    fontStyle: 'italic',
    fontSize: Typography.sm,
    paddingVertical: Spacing.md,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '14' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipLabel: { color: Colors.textMuted, fontWeight: '600', fontSize: Typography.sm },
  chipLabelOn: { color: Colors.text },
  check: { color: Colors.primary, fontWeight: '800', fontSize: 12, marginLeft: 2 },
  count: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: Spacing.xs },
});
