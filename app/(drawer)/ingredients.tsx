import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Colors, EmptyStateCard, FlatListCard, Header, SearchBar, Spacing } from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';

export default function IngredientsScreen() {
  const router = useRouter();
  const ingredients = usePosStore((state) => state.ingredients);
  const [searchQ, setSearchQ] = useState('');

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <View style={styles.container}>
      <Header
        title="Bahan Baku (Stock)"
        actions={[
          { icon: 'download-outline', onPress: () => router.push('/ingredients/receive') },
          { icon: 'add', onPress: () => router.push('/ingredients/add') },
        ]}
      />
      <View style={styles.searchWrap}>
        <SearchBar 
          value={searchQ} 
          onChangeText={setSearchQ} 
          placeholder="Search ingredients..." 
          rightIcon={searchQ ? 'close-circle' : 'search'}
          onRightIconPress={() => setSearchQ('')}
        />
      </View>
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="cube-outline"
            title="No Ingredients"
            description={ingredients.length === 0 ? "Add raw materials like coffee beans, milk, or cups to start managing stock and HPP." : "No results match your search."}
            actionLabel="Add Ingredient"
            onAction={() => router.push('/ingredients/add')}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const unitLabel = item.type === 'WEIGHT' ? 'g' : item.type === 'VOLUME' ? 'ml' : 'pcs';
            return (
              <FlatListCard
                leftIcon="cube-outline"
                title={item.name}
                subtitle={`Current Stock: ${item.stock} ${unitLabel}`}
                badge={item.type}
                badgeColor={item.type === 'WEIGHT' ? Colors.success : item.type === 'VOLUME' ? Colors.info : Colors.warning}
                trailingValue={`Rp ${item.costPerUnit} / ${unitLabel}`}
                onLongPress={() => router.push({ pathname: '/ingredients/add', params: { id: item.id } })}
                onPress={() => router.push({ pathname: '/ingredients/receive', params: { id: item.id } })}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  list: { padding: Spacing.lg },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
});
