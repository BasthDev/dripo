import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Colors, Dropdown, InputField, Radius, Spacing, Typography } from '../ui';
import type { Ingredient } from '../../store/usePosStore';
import {
  calcCostPerUnit,
  displayUnitOptionsForDropdown,
  formatCostPerUnit,
  resolveIngredientLine,
  type DisplayUnit,
  type IngredientLineInputState,
} from '../../utils/ingredientCost';
import IngredientQtyInput from './IngredientQtyInput';

type Props = {
  ingredient: Ingredient;
  value: IngredientLineInputState;
  onChange: (value: IngredientLineInputState) => void;
  style?: ViewStyle;
  compact?: boolean;
};

export default function IngredientProcurementLineFields({
  ingredient,
  value,
  onChange,
  style,
  compact,
}: Props) {
  const unitOptions = displayUnitOptionsForDropdown(ingredient.type);

  const resolved = useMemo(
    () => resolveIngredientLine(value, ingredient.type),
    [value, ingredient.type]
  );

  const previewCost = useMemo(() => {
    if (value.costMode === 'perBase') {
      const c = parseFloat(value.unitCostPerBase);
      return !isNaN(c) && c > 0 ? c : 0;
    }
    const pAmt = parseFloat(value.purchaseAmount);
    const pTotal = parseFloat(value.purchaseTotal);
    if (isNaN(pAmt) || pAmt <= 0 || isNaN(pTotal) || pTotal < 0) return 0;
    return calcCostPerUnit(pTotal, pAmt, value.purchaseUnit);
  }, [value, ingredient.type]);

  const lineTotal =
    resolved && resolved.baseQty > 0
      ? resolved.baseQty * resolved.unitCost
      : 0;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <IngredientQtyInput
        type={ingredient.type}
        amount={value.qtyAmount}
        unit={value.qtyUnit}
        onAmountChange={qtyAmount => onChange({ ...value, qtyAmount })}
        onUnitChange={qtyUnit => onChange({ ...value, qtyUnit })}
        label="Qty received"
        compact={compact}
      />

      {value.costMode === 'purchase' ? (
        <View style={styles.costCard}>
          <Text style={styles.costTitle}>Purchase price</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField
                label="Package"
                placeholder="1"
                keyboardType="decimal-pad"
                value={value.purchaseAmount}
                onChangeText={purchaseAmount => onChange({ ...value, purchaseAmount })}
              />
            </View>
            <View style={styles.unitCol}>
              <Dropdown
                label="Unit"
                options={unitOptions}
                value={value.purchaseUnit}
                onChange={opt =>
                  onChange({ ...value, purchaseUnit: opt.value as DisplayUnit })
                }
              />
            </View>
          </View>
          <InputField
            label="Total paid (Rp)"
            placeholder="25000"
            keyboardType="numeric"
            value={value.purchaseTotal}
            onChangeText={purchaseTotal => onChange({ ...value, purchaseTotal })}
            iconLeft="cash-outline"
          />
          {previewCost > 0 ? (
            <Text style={styles.hint}>
              Cost: {formatCostPerUnit(previewCost, ingredient.type)}
            </Text>
          ) : null}
        </View>
      ) : (
        <InputField
          label={`Cost per ${ingredient.type === 'WEIGHT' ? 'g' : ingredient.type === 'VOLUME' ? 'ml' : 'pcs'} (Rp)`}
          keyboardType="decimal-pad"
          value={value.unitCostPerBase}
          onChangeText={unitCostPerBase => onChange({ ...value, unitCostPerBase })}
        />
      )}

      <TouchableOpacity
        onPress={() =>
          onChange({
            ...value,
            costMode: value.costMode === 'purchase' ? 'perBase' : 'purchase',
          })
        }
      >
        <Text style={styles.toggle}>
          {value.costMode === 'purchase'
            ? 'Enter cost per g/ml instead'
            : 'Use package price (e.g. 1 L @ Rp 25k)'}
        </Text>
      </TouchableOpacity>

      {lineTotal > 0 ? (
        <Text style={styles.lineTotal}>Line total: Rp {lineTotal.toLocaleString()}</Text>
      ) : null}
    </View>
  );
}

export { type IngredientLineInputState };

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  wrapCompact: { gap: Spacing.sm },
  costCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  costTitle: { color: Colors.text, fontWeight: '600', fontSize: Typography.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  flex: { flex: 1 },
  unitCol: { width: 120 },
  hint: { color: Colors.primary, fontSize: Typography.xs, fontWeight: '600' },
  toggle: { color: Colors.primary, fontSize: Typography.xs, fontWeight: '600' },
  lineTotal: {
    color: Colors.success,
    fontWeight: '700',
    fontSize: Typography.sm,
    textAlign: 'right',
  },
});
