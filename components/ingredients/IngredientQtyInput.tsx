import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Dropdown, InputField, Spacing, Typography, Colors } from '../ui';
import type { IngredientType } from '../../store/usePosStore';
import {
  defaultDisplayUnit,
  displayUnitOptionsForDropdown,
  formatStockDisplay,
  toBaseAmount,
  type DisplayUnit,
} from '../../utils/ingredientCost';

type Props = {
  type: IngredientType;
  amount: string;
  unit: DisplayUnit;
  onAmountChange: (amount: string) => void;
  onUnitChange: (unit: DisplayUnit) => void;
  label?: string;
  /** Shown under inputs when amount parses (e.g. "= 2000 ml stored") */
  basePreview?: number | null;
  style?: ViewStyle;
  compact?: boolean;
};

export default function IngredientQtyInput({
  type,
  amount,
  unit,
  onAmountChange,
  onUnitChange,
  label = 'Quantity',
  basePreview,
  style,
  compact,
}: Props) {
  const unitOptions = displayUnitOptionsForDropdown(type);
  const amt = parseFloat(amount);
  const previewBase =
    basePreview !== undefined
      ? basePreview
      : !isNaN(amt) && amt > 0
        ? toBaseAmount(amt, unit)
        : null;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <View style={styles.amountField}>
          <InputField
            label={label}
            placeholder={compact ? '0' : 'e.g. 2'}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={onAmountChange}
          />
        </View>
        <View style={[styles.unitField, compact && styles.unitFieldCompact]}>
          <Dropdown
            label="Unit"
            options={unitOptions}
            value={unit}
            onChange={opt => onUnitChange(opt.value as DisplayUnit)}
          />
        </View>
      </View>
      {previewBase != null && previewBase > 0 ? (
        <Text style={styles.preview}>
          = {formatStockDisplay(previewBase, type)} in inventory
        </Text>
      ) : null}
    </View>
  );
}

export function defaultQtyForType(type: IngredientType): DisplayUnit {
  return defaultDisplayUnit(type);
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  amountField: { flex: 1 },
  unitField: { width: 128 },
  unitFieldCompact: { width: 100 },
  preview: { color: Colors.textMuted, fontSize: Typography.xs },
});
