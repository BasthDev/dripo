import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Colors, EmptyStateCard, FlatListCard, Header, Spacing } from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { usePosStore } from '../../../store/usePosStore';

export default function SuppliersScreen() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const suppliers = usePosStore(s => s.suppliers);
  const deleteSupplier = usePosStore(s => s.deleteSupplier);

  const sorted = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers]
  );

  const handleDelete = (id: string, name: string) => {
    showConfirm({
      title: 'Delete supplier',
      description: `Remove ${name}?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        const ok = deleteSupplier(id);
        if (!ok) {
          showMessage({
            title: 'Cannot delete',
            description: 'Supplier is linked to purchase orders or stock-in documents.',
            icon: 'alert-circle-outline',
            iconColor: Colors.error,
          });
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title="Suppliers"
        subtitle="Vendor master data"
        actions={[{ icon: 'add', onPress: () => router.push('/suppliers/add') }]}
      />
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="business-outline"
            title="No suppliers"
            description="Add distributors and vendors used on purchases."
            actionLabel="Add supplier"
            onAction={() => router.push('/suppliers/add')}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={sorted}
          keyExtractor={s => s.id}
          renderItem={({ item }) => (
            <FlatListCard
              title={item.name}
              subtitle={[item.phone, item.email].filter(Boolean).join(' · ') || 'No contact'}
              leftIcon="business-outline"
              leftIconColor={Colors.primary}
              onPress={() =>
                router.push({ pathname: '/suppliers/add', params: { id: item.id } })
              }
              onLongPress={() => handleDelete(item.id, item.name)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
});
