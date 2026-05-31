import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CartPanel from '../../../components/pos/CartPanel';
import { Button, Colors, GridCard, Header, Popup, SearchBar, Spacing, Typography } from '../../../components/ui';
import { selectCartTotal, useCartStore } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';
import { leaveTableSale, type TableOrderNavFrom } from '../../../utils/tableOrderFlow';

export default function POSScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;

  const products = usePosStore(state => state.products);
  const categories = usePosStore(state => state.categories);
  const canAddToCart = usePosStore(state => state.canAddToCart);
  const getMaxAddable = usePosStore(state => state.getMaxAddable);

  const { tableId, from, mode } = useLocalSearchParams<{
    tableId?: string;
    from?: TableOrderNavFrom;
    mode?: 'add' | 'edit';
  }>();
  const diningTables = usePosStore(state => state.diningTables);

  const {
    items,
    addItem,
    getCartItemsForCheck,
    loadTableOrderIntoCart,
    setTableSession,
    activeTableId,
    clearCart,
  } = useCartStore();
  const cartTotal = useCartStore(selectCartTotal);

  const isTableEdit = from === 'orders' && !!tableId;
  const activeTable = diningTables.find(t => t.id === (activeTableId ?? tableId));

  useEffect(() => {
    if (!tableId) return;
    if (mode === 'add') {
      setTableSession(tableId);
      return;
    }
    loadTableOrderIntoCart(tableId);
  }, [tableId, mode, loadTableOrderIntoCart, setTableSession]);

  const handleLeaveTableSale = useCallback(() => {
    setLeavePopupVisible(true);
  }, []);

  const confirmLeaveTableSale = useCallback(() => {
    clearCart();
    setLeavePopupVisible(false);
    leaveTableSale(router, from, tableId);
  }, [clearCart, router, from, tableId]);

  const [leavePopupVisible, setLeavePopupVisible] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [stockAlertProduct, setStockAlertProduct] = useState<string | null>(null);
  const [skuScanMessage, setSkuScanMessage] = useState<string | null>(null);

  const cartItemsForCheck = getCartItemsForCheck();

  const tryQuickAddBySku = (query: string): boolean => {
    const q = query.trim();
    if (q.length < 3) return false;

    const exact = products.find((p) => p.sku === q);
    const bySuffix = products.filter((p) => p.sku.endsWith(q));
    const product = exact ?? (bySuffix.length === 1 ? bySuffix[0] : null);

    if (!product) {
      if (bySuffix.length > 1) {
        setSkuScanMessage(`Several products match SKU ending "${q}". Refine your search.`);
      }
      return false;
    }

    const cartForCheck = getCartItemsForCheck();
    if (!canAddToCart(product.id, 1, cartForCheck)) {
      setStockAlertProduct(product.name);
      return true;
    }

    addItem(product);
    setSearchQ('');
    setSkuScanMessage(null);
    return true;
  };

  const handleSearchSubmit = () => {
    if (tryQuickAddBySku(searchQ)) return;
    setSkuScanMessage(null);
  };

  // Filtering
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.sku.includes(searchQ);
    const matchesCategory = activeCategoryId ? p.categoryId === activeCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddProduct = (product: typeof products[0]) => {
    const cartForCheck = getCartItemsForCheck();
    if (!canAddToCart(product.id, 1, cartForCheck)) {
      setStockAlertProduct(product.name);
      return;
    }
    addItem(product);
  };

  return (
    <View style={styles.container}>
      <Header
        title={activeTable ? `Sale · ${activeTable.name}` : 'Point of Sale'}
        subtitle={
          activeTable
            ? mode === 'add'
              ? `${activeTable.zone} · add new items, then save table order`
              : `${activeTable.zone} · edit items, then save table order`
            : undefined
        }
        onBack={isTableEdit ? handleLeaveTableSale : undefined}
        actions={[
          {
            icon: showSearch ? 'close-outline' : 'search-outline',
            onPress: () => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQ('');
            },
          },
          ...(isTableEdit
            ? [
                {
                  icon: 'close-circle-outline' as const,
                  color: Colors.textMuted,
                  onPress: handleLeaveTableSale,
                },
              ]
            : []),
        ]}
      />

      <View style={styles.main}>
        {/* Left Panel: Products Grid */}
        <View style={styles.productsPanel}>
          {showSearch && (
            <View style={styles.filterBar}>
              <SearchBar
                value={searchQ}
                onChangeText={(t) => {
                  setSearchQ(t);
                  setSkuScanMessage(null);
                }}
                placeholder="SKU (3+ digit) / nama — tekan Cari"
                rightIcon={
                  /^\d{3,}$/.test(searchQ.trim()) ? 'search' : searchQ ? 'close-circle' : 'search'
                }
                onRightIconPress={() => {
                  if (/^\d{3,}$/.test(searchQ.trim())) {
                    handleSearchSubmit();
                  } else if (searchQ) {
                    setSearchQ('');
                    setSkuScanMessage(null);
                  }
                }}
                onSubmitEditing={handleSearchSubmit}
                keepFocusOnSubmit
                autoFocus
              />
              {skuScanMessage ? (
                <Text style={styles.skuHint}>{skuScanMessage}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.categoryBar}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: null, name: 'All', color: Colors.primary }, ...categories]}
              keyExtractor={(c) => c.id || 'all'}
              renderItem={({ item }) => {
                const isActive = activeCategoryId === item.id;
                const tagColor = 'color' in item && item.color ? item.color : Colors.primary;
                return (
                  <Button
                    label={item.name}
                    variant={isActive ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => setActiveCategoryId(item.id)}
                    style={{
                      marginRight: Spacing.sm,
                      ...(!isActive ? { borderColor: tagColor } : {}),
                    }}
                    textStyle={!isActive ? { color: tagColor } : undefined}
                  />
                );
              }}
            />
          </View>

          <FlatList
            data={filteredProducts}
            keyExtractor={p => p.id}
            numColumns={isTablet ? 3 : 2}
            key={isTablet ? 'tablet' : 'mobile'}
            contentContainerStyle={styles.productGrid}
            columnWrapperStyle={styles.productGridRow}
            renderItem={({ item }) => {
              const maxAddable = getMaxAddable(item.id, cartItemsForCheck);
              const isOutOfStock = maxAddable <= 0;
              const isLowStock = !isOutOfStock && maxAddable <= 3 && maxAddable !== Infinity;
              const cartQty = items.find(i => i.product.id === item.id)?.quantity ?? 0;

              return (
                <View style={[isTablet ? styles.tabletCard : styles.mobileCard, { position: 'relative' }]}>
                  <GridCard
                    title={item.name}
                    subtitle={`SKU: ${item.sku}`}
                    image={item.imageUri ? { uri: item.imageUri } : undefined}
                    icon="cafe-outline"
                    iconColor={isOutOfStock ? Colors.textMuted : Colors.accent}
                    footerRight={`Rp ${item.sellPrice.toLocaleString()}`}
                    style={[
                      { flex: 1, opacity: isOutOfStock ? 0.55 : 1 },
                    ]}
                    onPress={() => handleAddProduct(item)}
                  />

                  {/* Cart qty badge */}
                  {cartQty > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartQty}</Text>
                    </View>
                  )}

                  {/* Out of stock overlay label */}
                  {isOutOfStock && (
                    <View style={styles.outOfStockOverlay} pointerEvents="none">
                      <View style={styles.outOfStockBadge}>
                        <Ionicons name="ban-outline" size={11} color={Colors.white} />
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                      </View>
                    </View>
                  )}

                  {/* Low stock warning */}
                  {isLowStock && (
                    <View style={styles.lowStockBadge} pointerEvents="none">
                      <Text style={styles.lowStockText}>Only {maxAddable} left</Text>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No products found matching criteria.</Text>
            )}
          />
        </View>

        {/* Right Panel: Cart (Only on Tablet) */}
        {isTablet && (
          <View style={styles.cartPanel}>
            <CartPanel
              navFrom={from === 'orders' ? 'orders' : 'pos'}
              tableSaleMode={mode === 'add' || mode === 'edit' ? mode : undefined}
            />
          </View>
        )}
      </View>

      {/* Floating Cart Button (Only on Mobile) */}
      {!isTablet && totalItems > 0 && (
        <View style={[styles.floatingCart, { bottom: insets.bottom + Spacing.md }]}>
          <Button
            label={`View Cart (${totalItems}) • Rp ${cartTotal.toLocaleString()}`}
            variant="primary"
            iconLeft="cart"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/pos/cart',
                params: {
                  from: from ?? '',
                  tableId: tableId ?? '',
                  mode: mode ?? '',
                },
              })
            }
          />
        </View>
      )}

      {/* Leave table popup */}
      <Popup
        visible={leavePopupVisible}
        onClose={() => setLeavePopupVisible(false)}
        icon="exit-outline"
        iconColor={Colors.warning}
        title="Leave table?"
        description="Your cart will be cleared. The table order on file stays unchanged until you save."
        dismissable
        actions={[
          { label: 'Stay', variant: 'outline', onPress: () => setLeavePopupVisible(false) },
          { label: 'Leave', variant: 'primary', onPress: confirmLeaveTableSale },
        ]}
        actionsLayout="row"
      />

      {/* Out of stock alert popup */}
      <Popup
        visible={!!stockAlertProduct}
        onClose={() => setStockAlertProduct(null)}
        icon="alert-circle-outline"
        iconColor={Colors.error}
        title="Out of Stock"
        description={`"${stockAlertProduct}" cannot be added — not enough ingredients in stock to fulfill this order.`}
        actions={[
          { label: 'View Low Stock', variant: 'outline', icon: 'list-outline', onPress: () => { setStockAlertProduct(null); router.push('/reports/low-stock' as any); } },
          { label: 'OK', variant: 'ghost', onPress: () => setStockAlertProduct(null) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  main: { flex: 1, flexDirection: 'row' },
  productsPanel: { flex: 2 },
  cartPanel: { flex: 1, maxWidth: 400 },
  filterBar: { padding: Spacing.md, paddingBottom: 0, gap: Spacing.xs },
  skuHint: { color: Colors.warning, fontSize: Typography.xs, paddingHorizontal: Spacing.xs },
  categoryBar: { padding: Spacing.md, paddingBottom: Spacing.sm },
  productGrid: { padding: Spacing.md, paddingBottom: 100 },
  productGridRow: { gap: Spacing.md, marginBottom: Spacing.md },
  tabletCard: { flex: 1, maxWidth: '32%' },
  mobileCard: { flex: 1, maxWidth: '48%' },
  floatingCart: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, zIndex: 50 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xxl },

  // Cart badge
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.primary,
    borderRadius: 99,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  cartBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },

  // Out of stock
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.error,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  outOfStockText: { color: Colors.white, fontSize: 10, fontWeight: '700' },

  // Low stock
  lowStockBadge: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lowStockText: {
    color: Colors.warning,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: Colors.warning + '22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
});
