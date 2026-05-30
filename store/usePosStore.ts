import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ensureCategoryColor, pickCategoryColor } from '../utils/categoryColors';
import { mergeRecipeLines, recipeIngredientsToLines } from '../utils/modifierUtils';

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

export interface ProductModifier {
  id: string;
  name: string;
  sellPriceDelta: number;
  recipeAdjustments: { ingredientId: string; quantityDelta: number }[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId?: string;
  useHpp: boolean;
  hppId?: string;
  buyPrice?: number;
  sellPrice: number;
  modifierIds?: string[];
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  social: string;
  qrData: string;
  receiptFooter: string;
  /** Local file URI for receipt logo (document directory) */
  logoUri?: string;
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
  cost: number; // per item COGS frozen at sale
  status?: TransactionStatus; // item level status
  note?: string; // per-line note (e.g. less ice, extra shot)
  hppId?: string; // recipe id at sale time
  /** Ingredient qty per unit frozen at sale — used for void/restock accuracy */
  recipeSnapshot?: { ingredientId: string; quantity: number }[];
  modifierIds?: string[];
  appliedModifiers?: { id: string; name: string; sellPriceDelta: number }[];
}

export interface Expense {
  id: string;
  timestamp: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  note?: string;
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
export type MovementReason = 'INITIAL' | 'MANUAL_ADJUSTMENT' | 'SALE' | 'VOID_ORDER' | 'VOID_ITEM' | 'PURCHASE';

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
  modifierIds?: string[];
}

type RecipeStockLine = { ingredientId: string; quantity: number };

function getItemStockLines(
  item: Pick<TransactionItem, 'recipeSnapshot' | 'hppId'>,
  product: Product | undefined,
  recipes: Recipe[]
): RecipeStockLine[] {
  if (item.recipeSnapshot?.length) {
    return item.recipeSnapshot;
  }
  const recipeId = item.hppId ?? product?.hppId;
  if (!recipeId) return [];
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return [];
  return recipe.ingredients.map(ri => ({
    ingredientId: ri.ingredientId,
    quantity: ri.quantity,
  }));
}

// ── Store State ──
interface PosState {
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: Category[];
  products: Product[];
  transactions: Transaction[];
  movements: StockMovement[];
  modifiers: ProductModifier[];
  expenses: Expense[];
  storeSettings: StoreSettings;

  // Actions
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => boolean;
  isIngredientInUse: (id: string) => boolean;

  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => boolean;
  isRecipeInUse: (id: string) => boolean;
  getRecipeCost: (recipeId: string) => number;

  addModifier: (modifier: Omit<ProductModifier, 'id'>) => void;
  updateModifier: (id: string, modifier: Partial<ProductModifier>) => void;
  deleteModifier: (id: string) => boolean;
  isModifierInUse: (id: string) => boolean;

  receiveStock: (params: {
    ingredientId: string;
    quantity: number;
    unitCost: number;
    note?: string;
    recordExpense?: boolean;
  }) => void;

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
  getMaxAddable: (productId: string, cartItems: CartItemForCheck[], modifierIds?: string[]) => number;

  canAddToCart: (productId: string, qty: number, cartItems: CartItemForCheck[], modifierIds?: string[]) => boolean;

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
      modifiers: [],
      expenses: [],
      storeSettings: {
        name: 'Dripo Coffee',
        address: '123 Brew Avenue, Caffeine City',
        phone: '+1 234 567 890',
        social: '@dripo_coffee',
        qrData: 'https://dripo.pos',
        receiptFooter: 'Thank you for your visit!',
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
        let recipes = state.recipes;
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

        if (
          old &&
          updated.costPerUnit !== undefined &&
          old.costPerUnit !== updated.costPerUnit
        ) {
          recipes = state.recipes.map(r => ({
            ...r,
            ingredients: r.ingredients.map(ri =>
              ri.ingredientId === id
                ? { ...ri, snapshotCost: updated.costPerUnit as number }
                : ri
            ),
          }));
        }

        return {
          ingredients: state.ingredients.map(i => i.id === id ? { ...i, ...updated } : i),
          movements,
          recipes,
        };
      }),
      isIngredientInUse: (id) => {
        const { recipes } = get();
        return recipes.some(r => r.ingredients.some(ri => ri.ingredientId === id));
      },
      deleteIngredient: (id) => {
        if (get().isIngredientInUse(id)) return false;
        set((state) => ({
          ingredients: state.ingredients.filter(i => i.id !== id),
        }));
        return true;
      },

      // Recipes
      addRecipe: (recipe) => set((state) => ({
        recipes: [...state.recipes, { ...recipe, id: uuid.v4() as string }],
      })),
      updateRecipe: (id, updated) => set((state) => ({
        recipes: state.recipes.map(r => r.id === id ? { ...r, ...updated } : r),
      })),
      deleteRecipe: (id) => {
        if (get().isRecipeInUse(id)) return false;
        set((state) => ({
          recipes: state.recipes.filter(r => r.id !== id),
        }));
        return true;
      },
      isRecipeInUse: (id) => {
        const { products } = get();
        return products.some(p => p.useHpp && p.hppId === id);
      },
      getRecipeCost: (recipeId: string) => {
        const { recipes, ingredients } = get();
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return 0;
        
        return recipe.ingredients.reduce((total, ri) => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          const unitCost = ing ? ing.costPerUnit : (ri.snapshotCost || 0);
          const lineCost = unitCost * (ri.quantity || 0);
          return total + (isNaN(lineCost) ? 0 : lineCost);
        }, 0);
      },

      addModifier: (modifier) => set((state) => ({
        modifiers: [...state.modifiers, { ...modifier, id: uuid.v4() as string }],
      })),
      updateModifier: (id, updated) => set((state) => ({
        modifiers: state.modifiers.map(m => m.id === id ? { ...m, ...updated } : m),
      })),
      isModifierInUse: (id) => {
        const { products } = get();
        return products.some(p => p.modifierIds?.includes(id));
      },
      deleteModifier: (id) => {
        if (get().isModifierInUse(id)) return false;
        set((state) => ({
          modifiers: state.modifiers.filter(m => m.id !== id),
        }));
        return true;
      },

      receiveStock: ({ ingredientId, quantity, unitCost, note, recordExpense }) => set((state) => {
        const ing = state.ingredients.find(i => i.id === ingredientId);
        if (!ing || quantity <= 0 || unitCost < 0) return state;

        const movement = addStockMovement(state, {
          ingredientId,
          type: 'IN',
          reason: 'PURCHASE',
          quantityDiff: quantity,
          note: note || 'Stock received',
        });

        const updatedIngredients = state.ingredients.map(i =>
          i.id === ingredientId
            ? { ...i, stock: i.stock + quantity, costPerUnit: unitCost }
            : i
        );

        let recipes = state.recipes;
        if (ing.costPerUnit !== unitCost) {
          recipes = state.recipes.map(r => ({
            ...r,
            ingredients: r.ingredients.map(ri =>
              ri.ingredientId === ingredientId
                ? { ...ri, snapshotCost: unitCost }
                : ri
            ),
          }));
        }

        const newExpenses = [...state.expenses];
        if (recordExpense) {
          newExpenses.push({
            id: uuid.v4() as string,
            timestamp: new Date().toISOString(),
            ingredientId,
            ingredientName: ing.name,
            quantity,
            unitCost,
            totalAmount: quantity * unitCost,
            note,
          });
        }

        return {
          ingredients: updatedIngredients,
          recipes,
          movements: [...state.movements, movement],
          expenses: newExpenses,
        };
      }),

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

        // Process inventory out-flows (use sale-time recipe snapshot when available)
        for (const item of tx.items) {
          const product = state.products.find(p => p.id === item.productId);
          const stockLines = getItemStockLines(item, product, state.recipes);
          if (stockLines.length === 0) continue;

          for (const ri of stockLines) {
            const totalQtyUsed = ri.quantity * item.quantity;

            updatedIngredients = updatedIngredients.map(ing => {
              if (ing.id === ri.ingredientId) {
                return { ...ing, stock: ing.stock - totalQtyUsed };
              }
              return ing;
            });

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

        for (const item of tx.items) {
          if (item.status === 'CANCELED') continue;

          const product = state.products.find(p => p.id === item.productId);
          const stockLines = getItemStockLines(item, product, state.recipes);
          for (const ri of stockLines) {
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
        const actualQtyToVoid = Math.min(Math.max(1, qtyToVoid ?? item.quantity), item.quantity);

        let updatedIngredients = [...state.ingredients];
        let newMovements = [...state.movements];

        const product = state.products.find(p => p.id === item.productId);
        const stockLines = getItemStockLines(item, product, state.recipes);
        for (const ri of stockLines) {
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
            note: `Void ${actualQtyToVoid}x ${item.name} (Tx: ${txId.substring(0, 6)}...)`
          });
          newMovements.push(mvt);
        }

        const remainingQty = item.quantity - actualQtyToVoid;
        const newItems = tx.items.map((it, idx) => {
          if (idx !== itemIndex) return it;
          if (remainingQty <= 0) {
            return { ...it, quantity: item.quantity, status: 'CANCELED' as TransactionStatus };
          }
          return { ...it, quantity: remainingQty };
        });

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
        const { products, recipes, modifiers } = get();
        const usage: Record<string, number> = {};

        for (const ci of cartItems) {
          const product = products.find(p => p.id === ci.productId);
          if (!product || !product.useHpp || !product.hppId) continue;
          const recipe = recipes.find(r => r.id === product.hppId);
          if (!recipe) continue;
          const lines = mergeRecipeLines(
            recipeIngredientsToLines(recipe.ingredients),
            ci.modifierIds ?? [],
            modifiers
          );
          for (const line of lines) {
            usage[line.ingredientId] = (usage[line.ingredientId] ?? 0) + line.quantity * ci.quantity;
          }
        }

        return usage;
      },

      getMaxAddable: (productId, cartItems, modifierIds = []) => {
        const { products, recipes, ingredients, modifiers } = get();
        const product = products.find(p => p.id === productId);
        if (!product || !product.useHpp || !product.hppId) return Infinity;

        const recipe = recipes.find(r => r.id === product.hppId);
        if (!recipe || recipe.ingredients.length === 0) return Infinity;

        const cartUsage = get().getCartIngredientUsage(cartItems);
        const productLines = mergeRecipeLines(
          recipeIngredientsToLines(recipe.ingredients),
          modifierIds,
          modifiers
        );

        let maxUnits = Infinity;
        for (const line of productLines) {
          const ing = ingredients.find(i => i.id === line.ingredientId);
          if (!ing) { maxUnits = 0; break; }
          const availableStock = ing.stock - (cartUsage[line.ingredientId] ?? 0);
          if (line.quantity <= 0) continue;
          const units = Math.floor(availableStock / line.quantity);
          if (units < maxUnits) maxUnits = units;
        }

        return Math.max(0, maxUnits);
      },

      canAddToCart: (productId, qty, cartItems, modifierIds = []) => {
        return get().getMaxAddable(productId, cartItems, modifierIds) >= qty;
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
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as {
          categories?: { id: string; name: string; color?: string }[];
          storeSettings?: Partial<StoreSettings>;
          modifiers?: ProductModifier[];
          expenses?: Expense[];
        };
        if (version < 2 && state?.categories) {
          state.categories = state.categories.map((c, i) => ({
            ...c,
            color: ensureCategoryColor(c.color, i),
          }));
        }
        if (state?.storeSettings) {
          if (!state.storeSettings.receiptFooter) {
            state.storeSettings.receiptFooter = 'Thank you for your visit!';
          }
        }
        if (!state.modifiers) state.modifiers = [];
        if (!state.expenses) state.expenses = [];
        return state as never;
      },
    }
  )
);
