import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Colors, Header, InputField, Radius, Spacing, Typography } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import { CATEGORY_PALETTE, pickCategoryColor } from '../../../utils/categoryColors';

export default function AddCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { categories, addCategory, updateCategory, deleteCategory } = usePosStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(pickCategoryColor(categories.length));

  useEffect(() => {
    if (id) {
      const existing = categories.find((c) => c.id === id);
      if (existing) {
        setName(existing.name);
        setColor(existing.color);
      }
    }
  }, [id, categories]);

  const handleSave = () => {
    if (!name.trim()) return;
    if (id) {
      updateCategory(id, { name: name.trim(), color });
    } else {
      addCategory(name.trim(), color);
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <Header
        title={id ? 'Edit Category' : 'Add Category'}
        onBack={() => router.back()}
        actions={
          id
            ? [
                {
                  icon: 'trash-outline',
                  color: Colors.error,
                  onPress: () => {
                    deleteCategory(id);
                    router.back();
                  },
                },
              ]
            : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <InputField
          label="Category Name"
          placeholder="e.g. Hot Coffees"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={styles.colorLabel}>Tag Color</Text>
        <Text style={styles.colorHint}>Used in POS tags and analytics charts</Text>
        <View style={styles.colorRow}>
          {CATEGORY_PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                color === c && styles.colorSwatchSelected,
              ]}
              onPress={() => setColor(c)}
            >
              {color === c && <Ionicons name="checkmark" size={18} color="#FFF" />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.previewTag, { backgroundColor: color + '22' }]}>
          <Ionicons name="pricetag" size={16} color={color} />
          <Text style={[styles.previewText, { color }]}>
            {name.trim() || 'Category preview'}
          </Text>
        </View>

        <Button
          label={id ? 'Save Changes' : 'Save Category'}
          variant="primary"
          iconLeft="save-outline"
          onPress={handleSave}
          disabled={!name.trim()}
          style={styles.saveBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  colorLabel: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  colorHint: { color: Colors.textMuted, fontSize: Typography.xs, marginBottom: Spacing.xs },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: Colors.text,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  previewText: { fontSize: Typography.sm, fontWeight: '700' },
  saveBtn: { marginTop: Spacing.md },
});
