import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Header, InputField, Button, Dropdown, DropdownOption, Colors, Spacing, Typography, Radius } from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';

export default function AddProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  
  const { recipes, products, getRecipeCost, addProduct, updateProduct, deleteProduct, addCategory, categories } = usePosStore();

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [useHpp, setUseHpp] = useState(false);
  const [hppId, setHppId] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  useEffect(() => {
    if (id) {
      const existing = products.find(p => p.id === id);
      if (existing) {
        setSku(existing.sku);
        setName(existing.name);
        setCategoryId(existing.categoryId || '');
        setUseHpp(existing.useHpp);
        setHppId(existing.hppId || '');
        setBuyPrice(existing.buyPrice ? existing.buyPrice.toString() : '');
        setSellPrice(existing.sellPrice.toString());
      }
    }
  }, [id, products]);

  // Category options
  const categoryOptions: DropdownOption[] = [
    { label: '+ Add New Category', value: 'NEW_CAT', icon: 'add-circle-outline' },
    ...categories.map(c => ({ label: c.name, value: c.id }))
  ];

  // Recipe Options
  const recipeOptions: DropdownOption[] = recipes.map(r => ({
    label: `${r.name} (Cost: Rp ${getRecipeCost(r.id)})`,
    value: r.id
  }));

  const handleSave = () => {
    if (!name.trim() || !sellPrice) return;
    const sellParsed = parseFloat(sellPrice);
    if (isNaN(sellParsed)) return;

    if (useHpp && !hppId) return;
    
    let buyParsed = 0;
    if (!useHpp) {
      if (!buyPrice) return;
      buyParsed = parseFloat(buyPrice);
      if (isNaN(buyParsed)) return;
    }

    const payload = {
      name,
      sku: sku.trim() === '' ? undefined : sku.trim(),
      categoryId: categoryId === 'NEW_CAT' || !categoryId ? undefined : categoryId,
      useHpp,
      hppId: useHpp ? hppId : undefined,
      buyPrice: useHpp ? undefined : buyParsed,
      sellPrice: sellParsed,
    };

    if (id) {
      updateProduct(id, payload);
    } else {
      addProduct(payload);
    }
    
    router.back();
  };

  const handleCategoryChange = (val: string) => {
    if (val === 'NEW_CAT') {
      const catName = 'New Category ' + (categories.length + 1);
      addCategory(catName);
      const latest = usePosStore.getState().categories.at(-1);
      if (latest) setCategoryId(latest.id);
    } else {
      setCategoryId(val);
    }
  };

  // Preview Calculations
  let activeCost = 0;
  if (useHpp && hppId) {
    activeCost = getRecipeCost(hppId) || 0;
  } else if (!useHpp && buyPrice) {
    activeCost = parseFloat(buyPrice) || 0;
  }

  const sellVal = parseFloat(sellPrice) || 0;
  const margin = sellVal - activeCost;
  const marginPct = (sellVal > 0 && !isNaN(margin)) ? ((margin / sellVal) * 100).toFixed(1) : '0';

  return (
    <View style={styles.container}>
      <Header 
        title={id ? "Edit Menu Product" : "Add Menu Product"} 
        onBack={() => router.back()} 
        actions={id ? [{
          icon: 'trash-outline', color: Colors.error, onPress: () => {
            deleteProduct(id);
            router.back();
          }
        }] : undefined}
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <InputField
          label="SKU (Barcode)"
          placeholder="Leave blank to auto-generate 12 digits"
          value={sku}
          onChangeText={setSku}
          iconLeft="barcode-outline"
          disabled={!!id} // SKU editing usually disabled after creation
        />

        <InputField
          label="Product Name"
          placeholder="e.g. Iced Caramel Macchiato"
          value={name}
          onChangeText={setName}
        />

        <View style={{ zIndex: 30 }}>
          <Dropdown
            label="Category"
            placeholder="Select category..."
            options={categoryOptions}
            value={categoryId}
            onChange={(opt) => handleCategoryChange(opt.value)}
          />
        </View>

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Use HPP / Recipe</Text>
            <Text style={styles.toggleDesc}>Link this product to a recipe for dynamic cost calculation.</Text>
          </View>
          <Switch
            value={useHpp}
            onValueChange={setUseHpp}
            trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
          />
        </View>

        {useHpp ? (
          <View style={{ zIndex: 20 }}>
            <Dropdown
              label="Select Recipe (HPP)"
              placeholder="Choose a recipe..."
              options={recipeOptions}
              value={hppId}
              onChange={(opt) => setHppId(opt.value)}
            />
          </View>
        ) : (
          <InputField
            label="Buy Price (Cost)"
            placeholder="0"
            keyboardType="numeric"
            value={buyPrice}
            onChangeText={setBuyPrice}
            iconLeft="cash-outline"
            hint="Manual cost of goods sold"
          />
        )}

        <InputField
          label="Selling Price"
          placeholder="0"
          keyboardType="numeric"
          value={sellPrice}
          onChangeText={setSellPrice}
          iconLeft="pricetag-outline"
        />

        {(activeCost > 0 || sellVal > 0) && (
          <View style={styles.marginBox}>
            <Text style={styles.marginTitle}>Profit Margin Preview</Text>
            <View style={styles.marginRow}>
              <Text style={styles.marginLabel}>Cost (HPP/Buy):</Text>
              <Text style={styles.marginValCost}>Rp {activeCost.toLocaleString()}</Text>
            </View>
            <View style={styles.marginRow}>
              <Text style={styles.marginLabel}>Selling Price:</Text>
              <Text style={styles.marginValSell}>Rp {sellVal.toLocaleString()}</Text>
            </View>
            <View style={[styles.marginRow, { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder }]}>
              <Text style={styles.marginLabel}>Profit / Margin:</Text>
              <Text style={[styles.marginValProfit, { color: margin > 0 ? Colors.success : Colors.error }]}>
                Rp {margin.toLocaleString()} ({marginPct}%)
              </Text>
            </View>
          </View>
        )}

        <Button
          label={id ? "Save Changes" : "Save Product"}
          variant="primary"
          iconLeft="save-outline"
          onPress={handleSave}
          disabled={!name.trim() || !sellPrice}
          style={styles.saveBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceElevated, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  toggleLabel: { color: Colors.text, fontSize: Typography.md, fontWeight: '600' },
  toggleDesc: { color: Colors.textSecondary, fontSize: Typography.xs, marginTop: 2, maxWidth: 220 },
  marginBox: { backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.surfaceBorder, gap: 4 },
  marginTitle: { color: Colors.text, fontWeight: '600', marginBottom: Spacing.xs },
  marginRow: { flexDirection: 'row', justifyContent: 'space-between' },
  marginLabel: { color: Colors.textSecondary, fontSize: Typography.sm },
  marginValCost: { color: Colors.error, fontSize: Typography.sm, fontWeight: '600' },
  marginValSell: { color: Colors.success, fontSize: Typography.sm, fontWeight: '600' },
  marginValProfit: { fontSize: Typography.md, fontWeight: '700' },
  saveBtn: { marginTop: Spacing.md },
});
