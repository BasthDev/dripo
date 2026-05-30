import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, EmptyStateCard, FlatListCard, Header, Spacing } from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';

export default function ModifiersScreen() {
  const router = useRouter();
  const modifiers = usePosStore(s => s.modifiers);

  return (
    <View style={styles.container}>
      <Header
        title="Product Modifiers"
        subtitle="Extra shots, sizes, add-ons"
        onBack={() => router.back()}
        actions={[{ icon: 'add', onPress: () => router.push('/modifiers/add') }]}
      />
      {modifiers.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="options-outline"
            title="No Modifiers"
            description="Create modifiers like Extra Shot, Large Size, etc."
            actionLabel="Create Modifier"
            onAction={() => router.push('/modifiers/add')}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={modifiers}
          keyExtractor={m => m.id}
          renderItem={({ item }) => (
            <FlatListCard
              title={item.name}
              subtitle={`${item.recipeAdjustments.length} ingredient adj.`}
              trailingValue={
                item.sellPriceDelta !== 0
                  ? `${item.sellPriceDelta > 0 ? '+' : ''}Rp ${item.sellPriceDelta.toLocaleString()}`
                  : 'Free'
              }
              leftIcon="add-circle-outline"
              leftIconColor={Colors.primary}
              onPress={() => router.push({ pathname: '/modifiers/add', params: { id: item.id } })}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
});
