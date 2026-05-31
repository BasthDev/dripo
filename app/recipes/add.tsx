import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Colors, Dropdown, DropdownOption, Header, InputField, Popup, Radius, Spacing, Typography } from '../../components/ui';
import { useAppPopup } from '../../hooks/useAppPopup';
import {
  bestDisplayForBase,
  defaultDisplayUnit,
  displayUnitOptionsForDropdown,
  formatCostPerUnit,
  formatRecipeQuantity,
  toBaseAmount,
  type DisplayUnit,
} from '../../utils/ingredientCost';
import { RecipeIngredient, usePosStore } from '../../store/usePosStore';

export default function AddRecipeScreen() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const { id } = useLocalSearchParams<{ id?: string }>();
  
  const [name, setName] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // Popup state
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<DisplayUnit>('g');

  const { ingredients, recipes, addRecipe, updateRecipe, deleteRecipe, isRecipeInUse } = usePosStore();

  useEffect(() => {
    if (id) {
      const existing = recipes.find(r => r.id === id);
      if (existing) {
        setName(existing.name);
        setRecipeIngredients(existing.ingredients);
      }
    }
  }, [id, recipes]);

  const handleOpenPopup = () => {
    setIsUpdating(false);
    setSelectedIngredientId('');
    setQuantity('');
    setQuantityUnit('g');
    setPopupOpen(true);
  };

  const handleOpenUpdatePopup = (ingId: string, baseQty: number) => {
    const ing = ingredients.find(i => i.id === ingId);
    setIsUpdating(true);
    setSelectedIngredientId(ingId);
    if (ing) {
      const { amount, unit } = bestDisplayForBase(baseQty, ing.type);
      setQuantity(amount);
      setQuantityUnit(unit);
    } else {
      setQuantity(baseQty.toString());
      setQuantityUnit('g');
    }
    setPopupOpen(true);
  };

  const handleAddIngredient = () => {
    if (!selectedIngredientId || !quantity) return;
    const qtyParsed = parseFloat(quantity);
    if (isNaN(qtyParsed) || qtyParsed <= 0) return;

    const ing = ingredients.find(i => i.id === selectedIngredientId);
    if (!ing) return;

    const baseQty = toBaseAmount(qtyParsed, quantityUnit);

    setRecipeIngredients(prev => {
      const existing = prev.find(p => p.ingredientId === selectedIngredientId);
      if (existing) {
        return prev.map(p =>
          p.ingredientId === selectedIngredientId
            ? {
                ...p,
                quantity: isUpdating ? baseQty : p.quantity + baseQty,
                snapshotCost: ing.costPerUnit,
              }
            : p
        );
      }
      return [
        ...prev,
        { ingredientId: selectedIngredientId, quantity: baseQty, snapshotCost: ing.costPerUnit },
      ];
    });
    setPopupOpen(false);
  };

  const handleRemoveIngredient = (ingId: string) => {
    setRecipeIngredients((prev) => prev.filter(p => p.ingredientId !== ingId));
  };

  const handleSaveRecipe = () => {
    if (!name.trim() || recipeIngredients.length === 0) return;
    
    if (id) {
      updateRecipe(id, { name: name.trim(), ingredients: recipeIngredients });
    } else {
      addRecipe({ name: name.trim(), ingredients: recipeIngredients });
    }
    router.back();
  };

  // Calculations for display - fallback to stock cost if snapshot absent
  const totalCost = recipeIngredients.reduce((sum, ri) => {
    const liveIng = ingredients.find(i => i.id === ri.ingredientId);
    const unitCost = liveIng ? liveIng.costPerUnit : (ri.snapshotCost || 0);
    return sum + unitCost * ri.quantity;
  }, 0);

  // Dropdown options
  const ingredientOptions: DropdownOption[] = ingredients.map(ing => ({
    label: `${ing.name} · ${formatCostPerUnit(ing.costPerUnit, ing.type)}`,
    value: ing.id,
    icon: 'cube-outline',
  }));

  const selectedIng = ingredients.find(i => i.id === selectedIngredientId);
  const unitOptions = selectedIng ? displayUnitOptionsForDropdown(selectedIng.type) : [];

  const handleIngredientSelect = (ingredientId: string) => {
    setSelectedIngredientId(ingredientId);
    const ing = ingredients.find(i => i.id === ingredientId);
    if (ing) {
      setQuantityUnit(defaultDisplayUnit(ing.type));
    }
  };

  const handleDelete = () => {
    if (!id) return;
    if (isRecipeInUse(id)) {
      showMessage({
        title: 'Cannot Delete',
        description: 'This recipe is linked to one or more products. Unlink them first.',
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
      return;
    }
    showConfirm({
      title: 'Delete Recipe',
      description: 'Are you sure?',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        deleteRecipe(id);
        router.back();
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title={id ? "Edit HPP / Recipe" : "Create HPP / Recipe"}
        onBack={() => router.back()}
        actions={id ? [{
          icon: 'trash-outline',
          color: Colors.error,
          onPress: handleDelete,
        }] : undefined}
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        <InputField
          label="Recipe Name"
          placeholder="e.g. Espresso Single Shot"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients List</Text>
            <TouchableOpacity onPress={handleOpenPopup}>
              <Text style={styles.addText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {recipeIngredients.length === 0 ? (
            <Text style={styles.emptyText}>No ingredients added. Press "+ Add Item".</Text>
          ) : (
            recipeIngredients.map((ri, index) => {
              const ing = ingredients.find(i => i.id === ri.ingredientId);
              // Handle case where ingredient might have been deleted, fallback to snapshot cost and ID.
              const dispName = ing ? ing.name : `Deleted Item`;
              const qtyLabel = ing ? formatRecipeQuantity(ri.quantity, ing.type) : `${ri.quantity}`;
              
              const unitCost = ing ? ing.costPerUnit : (ri.snapshotCost || 0);
              const subtotal = unitCost * ri.quantity;

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.itemRow}
                  onLongPress={() => handleOpenUpdatePopup(ri.ingredientId, ri.quantity)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{dispName}</Text>
                    <Text style={styles.itemDetails}>
                      {qtyLabel} × Rp {unitCost.toLocaleString()}
                    </Text>
                    {!ing && (
                      <Text style={styles.warnText}>Ingredient deleted — update this recipe.</Text>
                    )}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemTotal}>Rp {subtotal}</Text>
                    <TouchableOpacity onPress={() => handleRemoveIngredient(ri.ingredientId)} hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}>
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Total HPP Cost</Text>
          <Text style={styles.summaryValue}>Rp {totalCost.toLocaleString()}</Text>
        </View>

        <Button
          label={id ? "Save Changes" : "Save Recipe"}
          variant="primary"
          iconLeft="save-outline"
          onPress={handleSaveRecipe}
          disabled={!name.trim() || recipeIngredients.length === 0}
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Ingredient Picker Popup */}
      <Popup
        visible={isPopupOpen}
        onClose={() => setPopupOpen(false)}
        title={isUpdating ? "Update Quantity" : "Select Ingredient"}
        actions={[
          { label: isUpdating ? 'Update Item\n(and refresh cost)' : 'Add to Recipe', onPress: handleAddIngredient, variant: 'primary' },
        ]}
      >
        <View style={styles.popupContent}>
          <View style={{ zIndex: 10 }}>
            <Dropdown
              label="Ingredient"
              placeholder="Select from stock..."
              options={ingredientOptions}
              value={selectedIngredientId}
              onChange={opt => handleIngredientSelect(opt.value)}
              disabled={isUpdating}
            />
          </View>
          {selectedIngredientId !== '' && (
            <View style={styles.qtyRow}>
              <View style={styles.qtyField}>
                <InputField
                  label="Amount used"
                  placeholder="e.g. 18"
                  keyboardType="decimal-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={styles.qtyUnit}>
                <Dropdown
                  label="Unit"
                  options={unitOptions}
                  value={quantityUnit}
                  onChange={opt => setQuantityUnit(opt.value as DisplayUnit)}
                />
              </View>
            </View>
          )}
        </View>
      </Popup>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: 40 },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  sectionTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '600' },
  addText: { color: Colors.primary, fontSize: Typography.sm, fontWeight: '600' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sm, fontStyle: 'italic', paddingVertical: Spacing.md },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: Spacing.xs },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.text, fontSize: Typography.md, fontWeight: '500' },
  itemDetails: { color: Colors.textSecondary, fontSize: Typography.xs, marginTop: 2 },
  warnText: { color: Colors.warning, fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  itemRight: { alignItems: 'flex-end', flexDirection: 'row', gap: Spacing.md },
  itemTotal: { color: Colors.error, fontWeight: '600', fontSize: Typography.md },
  summaryContainer: { backgroundColor: Colors.surfaceElevated, padding: Spacing.lg, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  summaryLabel: { color: Colors.textSecondary, fontSize: Typography.sm },
  summaryValue: { color: Colors.text, fontSize: Typography.xxl, fontWeight: '700', marginTop: Spacing.xs },
  saveBtn: { marginTop: Spacing.sm },
  popupContent: { paddingVertical: Spacing.md },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  qtyField: { flex: 1 },
  qtyUnit: { width: 130 },
});
