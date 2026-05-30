import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Colors, Popup, Radius, Spacing, Typography } from '../ui';
import { ProductModifier } from '../../store/usePosStore';

type Props = {
  visible: boolean;
  productName: string;
  availableModifiers: ProductModifier[];
  selectedIds: string[];
  onClose: () => void;
  onSave: (modifierIds: string[]) => void;
};

export default function CartModifierPopup({
  visible,
  productName,
  availableModifiers,
  selectedIds,
  onClose,
  onSave,
}: Props) {
  const [picked, setPicked] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (visible) setPicked(selectedIds);
  }, [visible, selectedIds]);

  const toggle = (id: string) => {
    setPicked(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title="Modifiers"
      actions={[
        { label: 'Apply', onPress: () => onSave(picked), variant: 'primary' },
      ]}
    >
      <Text style={styles.subtitle}>{productName}</Text>
      {availableModifiers.length === 0 ? (
        <Text style={styles.empty}>No modifiers assigned to this product.</Text>
      ) : (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {availableModifiers.map(mod => {
            const active = picked.includes(mod.id);
            return (
              <TouchableOpacity
                key={mod.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => toggle(mod.id)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Ionicons
                    name={active ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={active ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={styles.rowName}>{mod.name}</Text>
                </View>
                {mod.sellPriceDelta !== 0 ? (
                  <Text style={styles.rowPrice}>
                    {mod.sellPriceDelta > 0 ? '+' : ''}Rp {mod.sellPriceDelta.toLocaleString()}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <Button label="Clear all" variant="outline" onPress={() => setPicked([])} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    marginBottom: Spacing.md,
  },
  empty: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    fontStyle: 'italic',
    paddingVertical: Spacing.lg,
  },
  list: { maxHeight: 260, marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  rowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  rowName: { color: Colors.text, fontSize: Typography.md, fontWeight: '600' },
  rowPrice: { color: Colors.primary, fontSize: Typography.sm, fontWeight: '700' },
});
