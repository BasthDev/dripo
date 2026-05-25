import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, FlatListCard, EmptyStateCard, SearchBar, Colors, Spacing } from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';

export default function RecipesScreen() {
  const router = useRouter();
  const recipes = usePosStore((state) => state.recipes);
  const getRecipeCost = usePosStore((state) => state.getRecipeCost);
  const [searchQ, setSearchQ] = useState('');

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <View style={styles.container}>
      <Header
        title="HPP / Recipes"
        actions={[
          { icon: 'add', onPress: () => router.push('/recipes/add') },
        ]}
      />
      <View style={styles.searchWrap}>
        <SearchBar 
          value={searchQ} 
          onChangeText={setSearchQ} 
          placeholder="Search recipes..." 
          rightIcon={searchQ ? 'close-circle' : 'search'}
          onRightIconPress={() => setSearchQ('')}
        />
      </View>
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="flask-outline"
            iconColor={Colors.secondary}
            title="No Recipes (HPP)"
            description={recipes.length === 0 ? "Create recipes by combining ingredients to automatically calculate production costs (HPP)." : "No recipes found."}
            actionLabel="Create Recipe"
            onAction={() => router.push('/recipes/add')}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const cost = getRecipeCost(item.id);
            return (
              <FlatListCard
                title={item.name}
                subtitle={`${item.ingredients.length} ingredients`}
                badge="HPP"
                badgeColor={Colors.secondary}
                trailingValue={`Rp ${cost.toLocaleString()}`}
                trailingValueColor={Colors.error}
                onLongPress={() => router.push({ pathname: '/recipes/add', params: { id: item.id } })}
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
