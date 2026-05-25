import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Header, InputField, Button, Dropdown, DropdownOption, Colors, Spacing, Typography, Radius } from '../../components/ui';
import { usePosStore, IngredientType } from '../../store/usePosStore';

const TYPE_OPTIONS: DropdownOption[] = [
  { label: 'Weight (Grams)', value: 'WEIGHT', icon: 'scale-outline' },
  { label: 'Volume (Milliliters)', value: 'VOLUME', icon: 'beaker-outline' },
  { label: 'Quantity (Pieces)', value: 'QUANTITY', icon: 'apps-outline' },
];

export default function AddIngredientScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  
  const ingredients = usePosStore((state) => state.ingredients);
  const addIngredient = usePosStore((state) => state.addIngredient);
  const updateIngredient = usePosStore((state) => state.updateIngredient);
  const deleteIngredient = usePosStore((state) => state.deleteIngredient);

  const [name, setName] = useState('');
  const [type, setType] = useState<IngredientType | ''>('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [stock, setStock] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      const existing = ingredients.find(i => i.id === id);
      if (existing) {
        setName(existing.name);
        setType(existing.type);
        setCostPerUnit(existing.costPerUnit.toString());
        setStock(existing.stock.toString());
      }
    }
  }, [id, ingredients]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Required';
    if (!type) newErrors.type = 'Required';
    
    const costParsed = parseFloat(costPerUnit);
    if (isNaN(costParsed) || costParsed < 0) newErrors.cost = 'Invalid numeric cost';
    
    const stockParsed = parseFloat(stock);
    if (isNaN(stockParsed) || stockParsed < 0) newErrors.stock = 'Invalid numeric stock';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (id) {
      updateIngredient(id, {
        name: name.trim(),
        type: type as IngredientType,
        costPerUnit: costParsed,
        stock: stockParsed,
      });
    } else {
      addIngredient({
        name: name.trim(),
        type: type as IngredientType,
        costPerUnit: costParsed,
        stock: stockParsed,
      });
    }

    router.back();
  };

  const unitHelper = type === 'WEIGHT' ? 'per gram' : type === 'VOLUME' ? 'per ml' : type === 'QUANTITY' ? 'per piece' : 'per unit';

  return (
    <View style={styles.container}>
      <Header
        title={id ? "Edit Ingredient" : "Add Ingredient"}
        onBack={() => router.back()}
        actions={id ? [{
          icon: 'trash-outline', color: Colors.error, onPress: () => {
            deleteIngredient(id);
            router.back();
          }
        }] : undefined}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <InputField
          label="Ingredient Name"
          placeholder="e.g. Arabica Beans"
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
          error={errors.name}
        />
        
        <View style={{ zIndex: 10 }}>
          <Dropdown
            label="Measurement Type"
            placeholder="Select a type..."
            options={TYPE_OPTIONS}
            value={type}
            onChange={(opt) => { setType(opt.value as IngredientType); setErrors((e) => ({ ...e, type: '' })); }}
            error={errors.type}
            disabled={!!id} // Usually changing base type after creation breaks inventory logic
          />
        </View>

        <InputField
          label={`Base Cost (${unitHelper})`}
          placeholder="0"
          keyboardType="numeric"
          value={costPerUnit}
          onChangeText={(t) => { setCostPerUnit(t); setErrors((e) => ({ ...e, cost: '' })); }}
          iconLeft="cash-outline"
          error={errors.cost}
          hint={`Always measure cost and stock at the base unit (${unitHelper}). E.g., if 1kg costs Rp 150k, cost per gram is 150.`}
        />

        <InputField
          label={`Current Stock (${type === 'WEIGHT' ? 'grams' : type === 'VOLUME' ? 'ml' : 'pcs'})`}
          placeholder="0"
          keyboardType="numeric"
          value={stock}
          onChangeText={(t) => { setStock(t); setErrors((e) => ({ ...e, stock: '' })); }}
          iconLeft="cube-outline"
          error={errors.stock}
        />

        <Button
          label={id ? "Save Changes" : "Save Ingredient"}
          variant="primary"
          iconLeft="save-outline"
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  saveBtn: { marginTop: Spacing.lg },
});
