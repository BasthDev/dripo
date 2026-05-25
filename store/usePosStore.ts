import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { ensureCategoryColor, pickCategoryColor } from '../utils/categoryColors';

// ── Types ──
export type IngredientType = 'WEIGHT' | 'VOLUME' | 'QUANTITY';

export interface Ingredient {
  id: string;
  name: string;
  type: IngredientType;
  costPerUnit: number; // Cost for 1g, 1ml, or 1pcs
  stock: number; // Current stock
  lowStockThreshold?: number; // Optional threshold to flag low stock
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number; // How many units (g/ml/pcs)
  snapshotCost: number; // Snapshot of ingredient cost when added
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Product {
  id: string;
  sku: string; // 12 digit string
  name: string;
  categoryId?: string;
  useHpp: boolean;
  hppId?: string; // Used if useHpp is true
  buyPrice?: number; // Used if useHpp is false
  sellPrice: number;
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  social: string;
  qrData: string;
}

export interface BluetoothPrinter {
  name: string;
  address: string;
  connected: boolean;
}

export type TransactionStatus = 'COMPLETED' | 'CANCELED';

// Transaction Types
export interface TransactionItem {
  productId: string;
  name: string; // snapshotted
  sku?: string; // snapshotted
  categoryName?: string; // snapshotted
  quantity: number;
  sellPrice: number; // per item
  cost: number; // per item, for profit tracking
  status?: TransactionStatus; // item level status
  note?: string; // per-line note (e.g. less ice, extra shot)
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO String
  items: TransactionItem[];
  totalAmount: number;
  paymentMethod: string;
  cashGiven?: number;
  change?: number;
  status: TransactionStatus;
  orderNote?: string; // whole-order note
}

// Movement Types
export type MovementType = 'IN' | 'OUT';
export type MovementReason = 'INITIAL' | 'MANUAL_ADJUSTMENT' | 'SALE' | 'VOID_ORDER' | 'VOID_ITEM';

export interface StockMovement {
  id: string;
  ingredientId: string;
  timestamp: string;
  type: MovementType;
  reason: MovementReason;
  quantityDiff: number; // e.g. +100 or -50
  note?: string;
}

// ── Cart Item shape (used for stock checks, defined here to avoid circular deps) ──
export interface CartItemForCheck {
  productId: string;
  quantity: number;
}

// ── Store State ──
interface PosState {
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: Category[];
  products: Product[];
  transactions: Transaction[];
  movements: StockMovement[];
  storeSettings: StoreSettings;

  // Actions
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;

  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  getRecipeCost: (recipeId: string) => number;

  addCategory: (name: string, color?: string) => void;
  updateCategory: (id: string, updates: { name?: string; color?: string }) => void;
  deleteCategory: (id: string) => void;

  addProduct: (product: Omit<Product, 'id' | 'sku'> & { sku?: string }) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  generateSku: () => string;

  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp' | 'status'> & { id?: string; timestamp?: string }) => void;
  voidTransaction: (id: string) => void;
  /**
   * Void a specific item (or partial qty) from a transaction.
   * - qtyToVoid: how many units to void. Defaults to the full remaining qty of that item.
   *   If qtyToVoid === item.quantity → item is marked CANCELED
   *   If qtyToVoid < item.quantity  → item qty is reduced (partial void)
   */
  voidTransactionItem: (txId: string, productId: string, qtyToVoid?: number) => void;
  updateStoreSettings: (settings: Partial<StoreSettings>) => void;
  connectedPrinter: BluetoothPrinter | null;
  setConnectedPrinter: (printer: BluetoothPrinter | null) => void;

  // ── Stock availability helpers ──
  /**
   * Returns the "committed" ingredient usage by all items in the provided cart
   * (keyed by ingredientId → total grams/ml/pcs already reserved).
   */
  getCartIngredientUsage: (cartItems: CartItemForCheck[]) => Record<string, number>;

  /**
   * Returns how many units of a product can still be added to cart
   * given the current real stock minus what the cart already reserves.
   * Returns Infinity for products that don't use HPP (no recipe → no ingredient tracking).
   */
  getMaxAddable: (productId: string, cartItems: CartItemForCheck[]) => number;

  /**
   * Returns true if `qty` more units of `productId` can be added to cart.
   */
  canAddToCart: (productId: string, qty: number, cartItems: CartItemForCheck[]) => boolean;

  /**
   * Returns all ingredients that are at or below their low stock threshold,
   * or whose stock is ≤ 0. Sorted by severity (most critical first).
   */
  getLowStockIngredients: () => Ingredient[];
}

const addStockMovement = (state: PosState, movement: Omit<StockMovement, 'id' | 'timestamp'>) => {
  return {
    ...movement,
    id: uuid.v4() as string,
    timestamp: new Date().toISOString()
  };
};

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      ingredients: [],
      recipes: [],
      categories: [],
      products: [],
      transactions: [],
      movements: [],
      storeSettings: {
        name: 'Dripo Coffee',
        address: '123 Brew Avenue, Caffeine City',
        phone: '+1 234 567 890',
        social: '@dripo_coffee',
        qrData: 'https://dripo.pos'
      },
      connectedPrinter: null,

      // Ingredients
      addIngredient: (ingredient) => set((state) => {
        const id = uuid.v4() as string;
        const newIngredient = { ...ingredient, id };
        const movement = addStockMovement(state, {
          ingredientId: id,
          type: 'IN',
          reason: 'INITIAL',
          quantityDiff: ingredient.stock,
          note: 'Initial Stock'
        });
        return {
          ingredients: [...state.ingredients, newIngredient],
          movements: [...state.movements, movement]
        };
      }),
      updateIngredient: (id, updated) => set((state) => {
        let movements = [...state.movements];
        const old = state.ingredients.find(i => i.id === id);
        
        if (old && updated.stock !== undefined && old.stock !== updated.stock) {
          const diff = updated.stock - old.stock;
          const movement = addStockMovement(state, {
            ingredientId: id,
            type: diff > 0 ? 'IN' : 'OUT',
            reason: 'MANUAL_ADJUSTMENT',
            quantityDiff: diff,
            note: 'Manual Adjustment'
          });
          movements.push(movement);
        }

        return {
          ingredients: state.ingredients.map(i => i.id === id ? { ...i, ...updated } : i),
          movements
        };
      }),
      deleteIngredient: (id) => set((state) => ({
        ingredients: state.ingredients.filter(i => i.id !== id),
      })),

      // Recipes
      addRecipe: (recipe) => set((state) => ({
        recipes: [...state.recipes, { ...recipe, id: uuid.v4() as string }],
      })),
      updateRecipe: (id, updated) => set((state) => ({
        recipes: state.recipes.map(r => r.id === id ? { ...r, ...updated } : r),
      })),
      deleteRecipe: (id) => set((state) => ({
        recipes: state.recipes.filter(r => r.id !== id),
      })),
      getRecipeCost: (recipeId: string) => {
        const { recipes, ingredients } = get();
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return 0;
        
        return recipe.ingredients.reduce((total, ri) => {
          let cost = ri.snapshotCost;
          if (cost === undefined || isNaN(cost)) {
            const ing = ingredients.find(i => i.id === ri.ingredientId);
            cost = ing ? ing.costPerUnit : 0;
          }
          const quantity = ri.quantity || 0;
          const lineCost = (cost || 0) * (quantity || 0);
          return total + (isNaN(lineCost) ? 0 : lineCost);
        }, 0);
      },

      // Categories
      addCategory: (name, color) => set((state) => ({
        categories: [
          ...state.categories,
          {
            id: uuid.v4() as string,
            name,
            color: color ?? pickCategoryColor(state.categories.length),
          },
        ],
      })),
      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map(c => {
          if (c.id !== id) return c;
          return {
            ...c,
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.color !== undefined ? { color: updates.color } : {}),
          };
        }),
      })),
      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id),
      })),

      // Products
      generateSku: () => {
        const { products } = get();
        const count = products.length + 1;
        return count.toString().padStart(12, '0');
      },
      addProduct: (product) => set((state) => ({
        products: [...state.products, {
          ...product,
          id: uuid.v4() as string,
          sku: product.sku || get().generateSku(),
        }],
      })),
      updateProduct: (id, updated) => set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updated } : p),
      })),
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(p => p.id !== id),
      })),

      // Transactions
      addTransaction: (tx) => set((state) => {
        const id = tx.id || (uuid.v4() as string);
        const timestamp = tx.timestamp || new Date().toISOString();
        const newTx = { 
          ...tx, 
          id, 
          timestamp,
          status: 'COMPLETED' as TransactionStatus,
          items: tx.items.map(i => ({ ...i, status: 'COMPLETED' as TransactionStatus }))
        };

        let updatedIngredients = [...state.ingredients];
        let newMovements = [...state.movements];

        // Process inventory out-flows
        for (const item of tx.items) {
          const product = state.products.find(p => p.id === item.productId);
          if (product && product.useHpp && product.hppId) {
            const recipe = state.recipes.find(r => r.id === product.hppId);
            if (recipe) {
              for (const ri of recipe.ingredients) {
                const totalQtyUsed = ri.quantity * item.quantity;
                
                // Deduct stock
                updatedIngredients = updatedIngredients.map(ing => {
                  if (ing.id === ri.ingredientId) {
                    return { ...ing, stock: ing.stock - totalQtyUsed };
                  }
                  return ing;
                });

                // Generate movement record
                const mvt = addStockMovement(state, {
                  ingredientId: ri.ingredientId,
                  type: 'OUT',
                  reason: 'SALE',
                  quantityDiff: -totalQtyUsed,
                  note: `Tx: ${id}`
                });
                newMovements.push(mvt);
              }
            }
          }
        }

        return {
          transactions: [...state.transactions, newTx],
          ingredients: updatedIngredients,
          movements: newMovements
        };
      }),

      voidTransaction: (id) => set((state) => {
        const tx = state.transactions.find(t => t.id === id);
        if (!tx || tx.status === 'CANCELED') return state;

        let updatedIngredients = [...state.ingredients];
        let newMovements = [...state.movements];

        // Restore stock for all non-canceled items
        for (const item of tx.items) {
          if (item.status === 'CANCELED') continue;

          const product = state.products.find(p => p.id === item.productId);
          if (product && product.useHpp && product.hppId) {
            const recipe = state.recipes.find(r => r.id === product.hppId);
            if (recipe) {
              for (const ri of recipe.ingredients) {
                const totalQtyRestore = ri.quantity * item.quantity;
                
                updatedIngredients = updatedIngredients.map(ing => {
                  if (ing.id === ri.ingredientId) {
                    return { ...ing, stock: ing.stock + totalQtyRestore };
                  }
                  return ing;
                });

                const mvt = addStockMovement(state, {
                  ingredientId: ri.ingredientId,
                  type: 'IN',
                  reason: 'VOID_ORDER',
                  quantityDiff: totalQtyRestore,
                  note: `Void Order: ${id}`
                });
                newMovements.push(mvt);
              }
            }
          }
        }

        return {
          transactions: state.transactions.map(t => 
            t.id === id 
              ? { 
                  ...t, 
                  status: 'CANCELED' as TransactionStatus, 
                  items: t.items.map(i => ({ ...i, status: 'CANCELED' as TransactionStatus })) 
                } 
              : t
          ),
          ingredients: updatedIngredients,
          movements: newMovements
        };
      }),

      voidTransactionItem: (txId, productId, qtyToVoid) => set((state) => {
        const tx = state.transactions.find(t => t.id === txId);
        if (!tx || tx.status === 'CANCELED') return state;

        const itemIndex = tx.items.findIndex(i => i.productId === productId && i.status !== 'CANCELED');
        if (itemIndex === -1) return state;

        const item = tx.items[itemIndex];
        // Clamp qtyToVoid between 1 and item.quantity
        const actualQtyToVoid = Math.min(Math.max(1, qtyToVoid ?? item.quantity), item.quantity);

        let updatedIngredients = [...state.ingredients];
        let newMovements = [...state.movements];

        // Restore stock for the voided portion
        const product = state.products.find(p => p.id === item.productId);
        if (product && product.useHpp && product.hppId) {
          const recipe = state.recipes.find(r => r.id === product.hppId);
          if (recipe) {
            for (const ri of recipe.ingredients) {
              const totalQtyRestore = ri.quantity * actualQtyToVoid;
              
              updatedIngredients = updatedIngredients.map(ing => {
                if (ing.id === ri.ingredientId) {
                  return { ...ing, stock: ing.stock + totalQtyRestore };
                }
                return ing;
              });

              const mvt = addStockMovement(state, {
                ingredientId: ri.ingredientId,
                type: 'IN',
                reason: 'VOID_ITEM',
                quantityDiff: totalQtyRestore,
                note: `Void ${actualQtyToVoid}x ${item.name} (Tx: ${txId})`
              });
              newMovements.push(mvt);
            }
          }
        }

        // Determine new item state
        const remainingQty = item.quantity - actualQtyToVoid;
        const newItems = tx.items.map((it, idx) => {
          if (idx !== itemIndex) return it;
          if (remainingQty <= 0) {
            // Full void → mark canceled
            return { ...it, quantity: item.quantity, status: 'CANCELED' as TransactionStatus };
          }
          // Partial void → reduce quantity, keep COMPLETED
          return { ...it, quantity: remainingQty };
        });

        // Recalculate total from active items only
        const newTotal = newItems.reduce((sum, it) => 
          sum + (it.status !== 'CANCELED' ? it.sellPrice * it.quantity : 0), 0
        );

        return {
          transactions: state.transactions.map(t => 
            t.id === txId ? { ...t, items: newItems, totalAmount: newTotal } : t
          ),
          ingredients: updatedIngredients,
          movements: newMovements
        };
      }),

      updateStoreSettings: (settings) => set((state) => ({
        storeSettings: { ...state.storeSettings, ...settings }
      })),
      setConnectedPrinter: (printer) => set(() => ({
        connectedPrinter: printer
      })),

      // ── Stock availability helpers ──────────────────────────────────────────
      getCartIngredientUsage: (cartItems) => {
        const { products, recipes } = get();
        const usage: Record<string, number> = {};

        for (const ci of cartItems) {
          const product = products.find(p => p.id === ci.productId);
          if (!product || !product.useHpp || !product.hppId) continue;
          const recipe = recipes.find(r => r.id === product.hppId);
          if (!recipe) continue;
          for (const ri of recipe.ingredients) {
            usage[ri.ingredientId] = (usage[ri.ingredientId] ?? 0) + ri.quantity * ci.quantity;
          }
        }

        return usage;
      },

      getMaxAddable: (productId, cartItems) => {
        const { products, recipes, ingredients } = get();
        const product = products.find(p => p.id === productId);
        if (!product || !product.useHpp || !product.hppId) return Infinity;

        const recipe = recipes.find(r => r.id === product.hppId);
        if (!recipe || recipe.ingredients.length === 0) return Infinity;

        // How much each ingredient is already consumed by the cart
        const cartUsage = get().getCartIngredientUsage(cartItems);

        // For each ingredient in this recipe, find how many products we can make
        let maxUnits = Infinity;
        for (const ri of recipe.ingredients) {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (!ing) { maxUnits = 0; break; }
          const availableStock = ing.stock - (cartUsage[ri.ingredientId] ?? 0);
          if (ri.quantity <= 0) continue;
          const units = Math.floor(availableStock / ri.quantity);
          if (units < maxUnits) maxUnits = units;
        }

        return Math.max(0, maxUnits);
      },

      canAddToCart: (productId, qty, cartItems) => {
        return get().getMaxAddable(productId, cartItems) >= qty;
      },

      getLowStockIngredients: () => {
        const { ingredients } = get();
        return ingredients
          .filter(ing => {
            if (ing.stock <= 0) return true;
            if (ing.lowStockThreshold !== undefined && ing.stock <= ing.lowStockThreshold) return true;
            return false;
          })
          .sort((a, b) => a.stock - b.stock); // most critical first
      },
    }),
    {
      name: 'pos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown) => {
        const state = persisted as { categories?: { id: string; name: string; color?: string }[] };
        if (state?.categories) {
          state.categories = state.categories.map((c, i) => ({
            ...c,
            color: ensureCategoryColor(c.color, i),
          }));
        }
        return state as never;
      },
    }
  )
);
