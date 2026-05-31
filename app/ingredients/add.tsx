import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Colors, Dropdown, Header, InputField, Radius, Spacing, Typography } from '../../components/ui';
import { useAppPopup } from '../../hooks/useAppPopup';
import {
  calcCostPerUnit,
  defaultDisplayUnit,
  formatCostPerUnit,
  fromBaseAmount,
  toBaseAmount,
  type DisplayUnit,
} from '../../utils/ingredientCost';
import { ingredientUnit } from '../../utils/ingredientUnits';
import { IngredientType, usePosStore } from '../../store/usePosStore';

const TYPE_OPTIONS = [
  { label: 'Weight (e.g. coffee, flour)', value: 'WEIGHT', icon: 'scale-outline' as const },
  { label: 'Volume (e.g. milk, syrup)', value: 'VOLUME', icon: 'beaker-outline' as const },
  { label: 'Count (e.g. cups, eggs)', value: 'QUANTITY', icon: 'apps-outline' as const },
];

export default function AddIngredientScreen() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const ingredients = usePosStore(state => state.ingredients);
  const addIngredient = usePosStore(state => state.addIngredient);
  const updateIngredient = usePosStore(state => state.updateIngredient);
  const deleteIngredient = usePosStore(state => state.deleteIngredient);
  const isIngredientInUse = usePosStore(state => state.isIngredientInUse);
  const recipes = usePosStore(state => state.recipes);

  const [name, setName] = useState('');
  const [type, setType] = useState<IngredientType | ''>('');
  const [purchaseAmount, setPurchaseAmount] = useState('1');
  const [purchaseUnit, setPurchaseUnit] = useState<DisplayUnit>('l');
  const [totalPrice, setTotalPrice] = useState('');
  const [stockAmount, setStockAmount] = useState('');
  const [stockUnit, setStockUnit] = useState<DisplayUnit>('l');
  const [useAdvancedCost, setUseAdvancedCost] = useState(false);
  const [costPerUnit, setCostPerUnit] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const unitOptions = useMemo(
    () =>
      type
        ? [
            ...(type === 'WEIGHT'
              ? [
                  { label: 'Kilogram (kg)', value: 'kg' },
                  { label: 'Gram (g)', value: 'g' },
                ]
              : type === 'VOLUME'
                ? [
                    { label: 'Liter (L)', value: 'l' },
                    { label: 'Milliliter (ml)', value: 'ml' },
                  ]
                : [{ label: 'Piece (pcs)', value: 'pcs' }]),
          ]
        : [],
    [type]
  );

  const computedCostPerUnit = useMemo(() => {
    if (!type || useAdvancedCost) return parseFloat(costPerUnit) || 0;
    const amt = parseFloat(purchaseAmount);
    const price = parseFloat(totalPrice);
    if (isNaN(amt) || isNaN(price) || amt <= 0) return 0;
    return calcCostPerUnit(price, amt, purchaseUnit);
  }, [type, useAdvancedCost, purchaseAmount, totalPrice, purchaseUnit, costPerUnit]);

  const computedStockBase = useMemo(() => {
    if (!type) return 0;
    const amt = parseFloat(stockAmount);
    if (isNaN(amt) || amt < 0) return 0;
    return toBaseAmount(amt, stockUnit);
  }, [type, stockAmount, stockUnit]);

  useEffect(() => {
    if (!id) return;
    const existing = ingredients.find(i => i.id === id);
    if (!existing) return;
    setName(existing.name);
    setType(existing.type);
    setCostPerUnit(existing.costPerUnit.toString());
    const def = defaultDisplayUnit(existing.type);
    setPurchaseUnit(def);
    setStockUnit(def);
    setPurchaseAmount('1');
    setTotalPrice(String(Math.round(existing.costPerUnit * toBaseAmount(1, def))));
    setStockAmount(String(fromBaseAmount(existing.stock, def)));
  }, [id, ingredients]);

  useEffect(() => {
    if (!type || id) return;
    const def = defaultDisplayUnit(type as IngredientType);
    setPurchaseUnit(def);
    setStockUnit(def);
    setPurchaseAmount('1');
  }, [type, id]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Required';
    if (!type) newErrors.type = 'Required';

    let finalCost = computedCostPerUnit;
    if (useAdvancedCost) {
      finalCost = parseFloat(costPerUnit);
      if (isNaN(finalCost) || finalCost < 0) newErrors.cost = 'Invalid cost';
    } else {
      const amt = parseFloat(purchaseAmount);
      const price = parseFloat(totalPrice);
      if (isNaN(amt) || amt <= 0) newErrors.purchase = 'Enter package size';
      if (isNaN(price) || price < 0) newErrors.price = 'Enter total price';
      if (finalCost <= 0) newErrors.price = 'Check amount and price';
    }

    const stockParsed = computedStockBase;
    if (isNaN(stockParsed) || stockParsed < 0) newErrors.stock = 'Invalid stock';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      name: name.trim(),
      type: type as IngredientType,
      costPerUnit: finalCost,
      stock: stockParsed,
    };

    if (id) updateIngredient(id, payload);
    else addIngredient(payload);
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    if (isIngredientInUse(id)) {
      const count = recipes.filter(r =>
        r.ingredients.some(ri => ri.ingredientId === id)
      ).length;
      showMessage({
        title: 'Cannot Delete',
        description: `This ingredient is used in ${count} recipe(s). Remove it from those recipes first.`,
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
      return;
    }
    showConfirm({
      title: 'Delete Ingredient',
      description: 'Are you sure?',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        deleteIngredient(id);
        router.back();
      },
    });
  };

  const baseUnit = type ? ingredientUnit(type) : 'unit';

  return (
    <View style={styles.container}>
      <Header
        title={id ? 'Edit Ingredient' : 'Add Ingredient'}
        onBack={() => router.back()}
        actions={
          id
            ? [{ icon: 'trash-outline' as const, color: Colors.error, onPress: handleDelete }]
            : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Enter what you buy (e.g. 1 liter for Rp 25,000). We calculate cost per {baseUnit} for
          recipes and stock automatically.
        </Text>

        <InputField
          label="Ingredient Name"
          placeholder="e.g. Fresh Milk"
          value={name}
          onChangeText={t => {
            setName(t);
            setErrors(e => ({ ...e, name: '' }));
          }}
          error={errors.name}
        />

        <View style={{ zIndex: 10 }}>
          <Dropdown
            label="Type"
            placeholder="Select..."
            options={TYPE_OPTIONS}
            value={type}
            onChange={opt => {
              setType(opt.value as IngredientType);
              setErrors(e => ({ ...e, type: '' }));
            }}
            error={errors.type}
            disabled={!!id}
          />
        </View>

        {type ? (
          <>
            {!useAdvancedCost ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Purchase price</Text>
                <Text style={styles.cardHint}>
                  Example: bought 1 L milk for Rp 25,000 → cost is Rp 25 per ml.
                </Text>
                <View style={styles.row}>
                  <View style={styles.rowField}>
                    <InputField
                      label="Package size"
                      placeholder="1"
                      keyboardType="decimal-pad"
                      value={purchaseAmount}
                      onChangeText={t => {
                        setPurchaseAmount(t);
                        setErrors(e => ({ ...e, purchase: '' }));
                      }}
                      error={errors.purchase}
                    />
                  </View>
                  <View style={styles.rowUnit}>
                    <Dropdown
                      label="Unit"
                      options={unitOptions}
                      value={purchaseUnit}
                      onChange={opt => setPurchaseUnit(opt.value as DisplayUnit)}
                    />
                  </View>
                </View>
                <InputField
                  label="Total price (Rp)"
                  placeholder="25000"
                  keyboardType="numeric"
                  value={totalPrice}
                  onChangeText={t => {
                    setTotalPrice(t);
                    setErrors(e => ({ ...e, price: '' }));
                  }}
                  iconLeft="cash-outline"
                  error={errors.price}
                />
                {computedCostPerUnit > 0 ? (
                  <View style={styles.preview}>
                    <Text style={styles.previewLabel}>Calculated cost</Text>
                    <Text style={styles.previewValue}>
                      {formatCostPerUnit(computedCostPerUnit, type as IngredientType)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <InputField
                label={`Cost per ${baseUnit} (advanced)`}
                placeholder="0"
                keyboardType="decimal-pad"
                value={costPerUnit}
                onChangeText={t => {
                  setCostPerUnit(t);
                  setErrors(e => ({ ...e, cost: '' }));
                }}
                iconLeft="cash-outline"
                error={errors.cost}
              />
            )}

            <Button
              label={useAdvancedCost ? 'Use purchase price calculator' : 'Enter cost per gram/ml manually'}
              variant="ghost"
              size="sm"
              onPress={() => setUseAdvancedCost(v => !v)}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Current stock</Text>
              <View style={styles.row}>
                <View style={styles.rowField}>
                  <InputField
                    label="Amount in stock"
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={stockAmount}
                    onChangeText={t => {
                      setStockAmount(t);
                      setErrors(e => ({ ...e, stock: '' }));
                    }}
                    error={errors.stock}
                  />
                </View>
                <View style={styles.rowUnit}>
                  <Dropdown
                    label="Unit"
                    options={unitOptions}
                    value={stockUnit}
                    onChange={opt => setStockUnit(opt.value as DisplayUnit)}
                  />
                </View>
              </View>
              {computedStockBase > 0 ? (
                <Text style={styles.stockPreview}>
                  Stored as {computedStockBase.toLocaleString()} {baseUnit} in inventory
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        <Button
          label={id ? 'Save Changes' : 'Save Ingredient'}
          variant="primary"
          iconLeft="save-outline"
          onPress={handleSave}
          style={styles.saveBtn}
          disabled={!type}
        />
      </ScrollView>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  intro: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  cardTitle: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: Typography.md,
  },
  cardHint: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  rowField: { flex: 1 },
  rowUnit: { width: 140 },
  preview: {
    backgroundColor: Colors.primary + '14',
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  previewLabel: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  previewValue: {
    color: Colors.primary,
    fontSize: Typography.lg,
    fontWeight: '800',
    marginTop: 4,
  },
  stockPreview: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  saveBtn: { marginTop: Spacing.sm },
});
