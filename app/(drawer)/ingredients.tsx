import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Colors,
  EmptyStateCard,
  FlatListCard,
  Header,
  SearchBar,
  Spacing,
} from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';
import { ingredientUnit } from '../../utils/ingredientUnits';

export default function IngredientsScreen() {
  const router = useRouter();
  const ingredients = usePosStore(state => state.ingredients);
  const [searchQ, setSearchQ] = useState('');

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header
        title="Ingredients"
        actions={[
          {
            icon: 'cart-outline',
            onPress: () => router.push('/procurement/purchases'),
          },
          { icon: 'add', onPress: () => router.push('/ingredients/add') },
        ]}
      />

      <View style={styles.topActions}>
        <Button
          label="Add new ingredient"
          variant="primary"
          iconLeft="add"
          onPress={() => router.push('/ingredients/add')}
        />
      </View>

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
            title="No ingredients"
            description={
              ingredients.length === 0
                ? 'Add coffee, milk, cups, etc. Then use Purchasing to receive stock.'
                : 'No results match your search.'
            }
            actionLabel="Add ingredient"
            onAction={() => router.push('/ingredients/add')}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const unit = ingredientUnit(item.type);
            return (
              <FlatListCard
                leftIcon="cube-outline"
                title={item.name}
                subtitle={`Stock: ${item.stock} ${unit}`}
                badge={item.type}
                badgeColor={
                  item.type === 'WEIGHT'
                    ? Colors.success
                    : item.type === 'VOLUME'
                      ? Colors.info
                      : Colors.warning
                }
                trailingValue={`Rp ${item.costPerUnit}/${unit}`}
                onPress={() =>
                  router.push({ pathname: '/ingredients/add', params: { id: item.id } })
                }
                onLongPress={() =>
                  router.push({
                    pathname: '/procurement/stock',
                    params: { focus: item.id },
                  })
                }
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListFooterComponent={
            <Text style={styles.footerHint}>
              Tap to edit · Long-press to receive stock for this item
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topActions: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  searchWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  list: { padding: Spacing.lg, paddingBottom: 32 },
  empty: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  footerHint: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
