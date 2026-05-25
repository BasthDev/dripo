import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, FlatListCard, EmptyStateCard, SearchBar, Colors, Spacing } from '../../components/ui';
import { usePosStore } from '../../store/usePosStore';

export default function ProductsScreen() {
  const router = useRouter();
  const products = usePosStore((state) => state.products);
  const getRecipeCost = usePosStore((state) => state.getRecipeCost);
  const [searchQ, setSearchQ] = useState('');

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchQ.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header
        title="Menu (Products)"
        actions={[
          { icon: 'add', onPress: () => router.push('/products/add') },
        ]}
      />
      <View style={styles.searchWrap}>
        <SearchBar 
          value={searchQ} 
          onChangeText={setSearchQ} 
          placeholder="Search by name or sku..." 
          rightIcon={searchQ ? 'close-circle' : 'search'}
          onRightIconPress={() => setSearchQ('')}
        />
      </View>
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <EmptyStateCard
            icon="cafe-outline"
            iconColor={Colors.success}
            title="No Products"
            description={products.length === 0 ? "Add products to your menu. You can link them to an HPP or set manual buy/sell prices." : "No products found."}
            actionLabel="Add Product"
            onAction={() => router.push('/products/add')}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            let cost = 0;
            if (item.useHpp && item.hppId) {
              cost = getRecipeCost(item.hppId);
            } else if (!item.useHpp && item.buyPrice) {
              cost = item.buyPrice;
            }
            
            const margin = item.sellPrice - cost;

            return (
              <FlatListCard
                title={item.name}
                subtitle={`SKU: ${item.sku}\nCost: Rp ${cost.toLocaleString()} | Margin: Rp ${margin.toLocaleString()}`}
                badge={item.useHpp ? 'Uses HPP' : 'Manual Cost'}
                badgeColor={item.useHpp ? Colors.primary : Colors.warning}
                trailingValue={`Rp ${item.sellPrice.toLocaleString()}`}
                trailingValueColor={Colors.success}
                leftIcon="fast-food-outline"
                leftIconColor={Colors.primary}
                onLongPress={() => router.push({ pathname: '/products/add', params: { id: item.id } })}
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
