import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Colors, EmptyStateCard, FlatListCard, Header, SearchBar, Spacing } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';

export default function CategoriesIndex() {
  const router = useRouter();
  const categories = usePosStore((state) => state.categories);
  const products = usePosStore((state) => state.products);
  const [searchQ, setSearchQ] = useState('');

  const filtered = categories.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <View style={styles.container}>
      <Header
        title="Categories"
        actions={[{ icon: 'add', onPress: () => router.push('/(drawer)/categories/add') }]}
      />
      <View style={styles.searchWrap}>
        <SearchBar
          value={searchQ}
          onChangeText={setSearchQ}
          placeholder="Search categories..."
          rightIcon={searchQ ? 'close-circle' : 'search'}
          onRightIconPress={() => setSearchQ('')}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="folder-open-outline"
            iconColor={Colors.warning}
            title="No Categories"
            description={categories.length === 0 ? "Create categories to organize your menu items." : "No categories matched."}
            actionLabel="Add Category"
            onAction={() => router.push('/(drawer)/categories/add')}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const count = products.filter(p => p.categoryId === item.id).length;
            return (
              <FlatListCard
                title={item.name}
                subtitle={`${count} connected products`}
                leftIcon="pricetag"
                leftIconColor={item.color}
                onLongPress={() =>
                  router.push({ pathname: '/(drawer)/categories/add', params: { id: item.id } })
                }
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
