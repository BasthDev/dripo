import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ensureCategoryColor, pickCategoryColor } from '../utils/categoryColors';
import { mergeRecipeLines, recipeIngredientsToLines } from '../utils/modifierUtils';
import { mergeTableOrderLines } from '../utils/tableOrderLines';
import { removeProductImageFile } from '../utils/productImage';

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
  /** Local file URI for POS grid image */
  imageUri?: string;
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

export type OperatingExpenseType =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARY'
  | 'MARKETING'
  | 'MAINTENANCE'
  | 'SUPPLIES'
  | 'OTHER';

export interface Expense {
  id: string;
  timestamp: string;
  category: 'INVENTORY' | 'OPERATING';
  totalAmount: number;
  note?: string;
  /** Inventory purchase (from stock in) */
  stockInId?: string;
  documentNo?: string;
  supplierId?: string;
  supplierName?: string;
  /** Operating expense */
  title?: string;
  operatingType?: OperatingExpenseType;
  ingredientId?: string;
  ingredientName?: string;
  quantity?: number;
  unitCost?: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}

export interface StockInLine {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

/** Goods receipt / stock-in document (like Majoo "Pembelian" / GRN) */
export interface StockInDocument {
  id: string;
  documentNo: string;
  timestamp: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNo?: string;
  purchaseOrderId?: string;
  lines: StockInLine[];
  totalAmount: number;
  note?: string;
  expenseRecorded: boolean;
}

export type PurchaseOrderStatus = 'DRAFT' | 'RECEIVED' | 'CANCELED';

export interface PurchaseOrderLine {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  documentNo: string;
  timestamp: string;
  supplierId?: string;
  supplierName?: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  totalAmount: number;
  note?: string;
  stockInId?: string;
}

export interface StockOpnameLine {
  ingredientId: string;
  ingredientName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  unitCost: number;
  varianceValue: number;
}

export interface StockOpnameDocument {
  id: string;
  documentNo: string;
  timestamp: string;
  reason: string;
  lines: StockOpnameLine[];
  note?: string;
}

export type TableOrderStatus = 'OPEN' | 'PAID';

export interface TableOrderLine {
  productId: string;
  quantity: number;
  note?: string;
  modifierIds?: string[];
}

export interface DiningTable {
  id: string;
  name: string;
  zone: string;
  sortOrder: number;
}

export interface TableOrder {
  id: string;
  tableId: string;
  documentNo: string;
  createdAt: string;
  updatedAt: string;
  status: TableOrderStatus;
  lines: TableOrderLine[];
  orderNote?: string;
  transactionId?: string;
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
export type MovementReason =
  | 'INITIAL'
  | 'MANUAL_ADJUSTMENT'
  | 'SALE'
  | 'VOID_ORDER'
  | 'VOID_ITEM'
  | 'PURCHASE'
  | 'STOCK_OPNAME'
  | 'WASTE';

export interface StockMovement {
  id: string;
  ingredientId: string;
  timestamp: string;
  type: MovementType;
  reason: MovementReason;
  quantityDiff: number;
  note?: string;
  referenceId?: string;
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
  stockIns: StockInDocument[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  stockOpnames: StockOpnameDocument[];
  tableZones: string[];
  diningTables: DiningTable[];
  tableOrders: TableOrder[];
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
    supplierId?: string;
    supplierName?: string;
    invoiceNo?: string;
  }) => string | null;

  createStockIn: (params: {
    lines: { ingredientId: string; quantity: number; unitCost: number }[];
    supplierId?: string;
    supplierName?: string;
    invoiceNo?: string;
    note?: string;
    recordExpense?: boolean;
    purchaseOrderId?: string;
  }) => string | null;

  nextStockInDocumentNo: () => string;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => boolean;

  addOperatingExpense: (params: {
    title: string;
    operatingType: OperatingExpenseType;
    totalAmount: number;
    note?: string;
    timestamp?: string;
  }) => void;

  postStockOpname: (params: {
    lines: { ingredientId: string; countedQty: number }[];
    reason: string;
    note?: string;
  }) => string | null;

  nextStockOpnameDocumentNo: () => string;

  createPurchaseOrder: (params: {
    lines: { ingredientId: string; quantity: number; unitCost: number }[];
    supplierId?: string;
    supplierName?: string;
    note?: string;
  }) => string;

  receivePurchaseOrder: (purchaseOrderId: string, recordExpense?: boolean) => string | null;

  cancelPurchaseOrder: (purchaseOrderId: string) => boolean;

  nextPurchaseOrderDocumentNo: () => string;

  recordWaste: (params: {
    ingredientId: string;
    quantity: number;
    note?: string;
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

  resetAllData: () => Promise<void>;

  addTableZone: (name: string) => void;
  removeTableZone: (name: string) => void;
  addDiningTable: (table: Omit<DiningTable, 'id' | 'sortOrder'>) => void;
  addDiningTablesBulk: (params: { baseName: string; count: number; zone: string }) => number;
  updateDiningTable: (id: string, updates: Partial<Pick<DiningTable, 'name' | 'zone'>>) => void;
  deleteDiningTable: (id: string) => void;
  getTableOrderForTable: (tableId: string) => TableOrder | undefined;
  upsertOpenTableOrder: (params: {
    tableId: string;
    lines: TableOrderLine[];
    orderNote?: string;
    /** When true, add/increase qty on matching lines instead of replacing the whole order */
    mergeLines?: boolean;
  }) => string;
  markTableOrderPaid: (tableOrderId: string, transactionId: string) => void;
  clearTable: (tableId: string) => void;
  nextTableOrderDocumentNo: () => string;
}

const DEFAULT_TABLE_ZONES = ['Indoor', 'Outdoor', 'Floor 1', 'Floor 2'];

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  name: 'Dripo Coffee',
  address: '123 Brew Avenue, Caffeine City',
  phone: '+1 234 567 890',
  social: '@dripo_coffee',
  qrData: 'https://dripo.pos',
  receiptFooter: 'Thank you for your visit!',
};

function calcWeightedAvgCost(
  oldStock: number,
  oldCost: number,
  addQty: number,
  addUnitCost: number
): number {
  const newStock = oldStock + addQty;
  if (newStock <= 0) return addUnitCost;
  return (oldStock * oldCost + addQty * addUnitCost) / newStock;
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
      stockIns: [],
      suppliers: [],
      purchaseOrders: [],
      stockOpnames: [],
      tableZones: [...DEFAULT_TABLE_ZONES],
      diningTables: [],
      tableOrders: [],
      storeSettings: { ...DEFAULT_STORE_SETTINGS },
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

      nextStockInDocumentNo: () => {
        const { stockIns } = get();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const todayCount =
          stockIns.filter(s => s.documentNo.includes(date)).length + 1;
        return `SI-${date}-${String(todayCount).padStart(3, '0')}`;
      },

      createStockIn: (params) => {
        const stockInId = uuid.v4() as string;
        const documentNo = get().nextStockInDocumentNo();
        const timestamp = new Date().toISOString();
        const recordExpense = params.recordExpense !== false;

        const supplierFromMaster = params.supplierId
          ? get().suppliers.find(s => s.id === params.supplierId)
          : undefined;
        const resolvedSupplierName =
          supplierFromMaster?.name ?? params.supplierName;
        const resolvedSupplierId = params.supplierId ?? supplierFromMaster?.id;

        let created = false;

        set((state) => {
          if (!params.lines.length) return state;

          let ingredients = [...state.ingredients];
          let recipes = [...state.recipes];
          let movements = [...state.movements];
          let purchaseOrders = [...state.purchaseOrders];
          const lines: StockInLine[] = [];

          for (const line of params.lines) {
            const ing = ingredients.find(i => i.id === line.ingredientId);
            if (!ing || line.quantity <= 0 || line.unitCost < 0) continue;

            const newAvgCost = calcWeightedAvgCost(
              ing.stock,
              ing.costPerUnit,
              line.quantity,
              line.unitCost
            );

            ingredients = ingredients.map(i =>
              i.id === line.ingredientId
                ? { ...i, stock: i.stock + line.quantity, costPerUnit: newAvgCost }
                : i
            );

            recipes = recipes.map(r => ({
              ...r,
              ingredients: r.ingredients.map(ri =>
                ri.ingredientId === line.ingredientId
                  ? { ...ri, snapshotCost: newAvgCost }
                  : ri
              ),
            }));

            movements.push(
              addStockMovement(state, {
                ingredientId: line.ingredientId,
                type: 'IN',
                reason: 'PURCHASE',
                quantityDiff: line.quantity,
                note: params.note || `Stock In ${documentNo}`,
                referenceId: stockInId,
              })
            );

            lines.push({
              ingredientId: line.ingredientId,
              ingredientName: ing.name,
              quantity: line.quantity,
              unitCost: line.unitCost,
              lineTotal: line.quantity * line.unitCost,
            });
          }

          if (!lines.length) return state;

          created = true;
          const totalAmount = lines.reduce((s, l) => s + l.lineTotal, 0);
          const stockIn: StockInDocument = {
            id: stockInId,
            documentNo,
            timestamp,
            supplierId: resolvedSupplierId,
            supplierName: resolvedSupplierName,
            invoiceNo: params.invoiceNo,
            purchaseOrderId: params.purchaseOrderId,
            lines,
            totalAmount,
            note: params.note,
            expenseRecorded: recordExpense,
          };

          if (params.purchaseOrderId) {
            purchaseOrders = purchaseOrders.map(po =>
              po.id === params.purchaseOrderId
                ? { ...po, status: 'RECEIVED' as PurchaseOrderStatus, stockInId }
                : po
            );
          }

          const newExpenses = [...state.expenses];
          if (recordExpense) {
            newExpenses.push({
              id: uuid.v4() as string,
              timestamp,
              category: 'INVENTORY',
              totalAmount,
              note: params.note,
              stockInId,
              documentNo,
              supplierId: resolvedSupplierId,
              supplierName: resolvedSupplierName,
            });
          }

          return {
            ingredients,
            recipes,
            movements,
            purchaseOrders,
            stockIns: [...state.stockIns, stockIn],
            expenses: newExpenses,
          };
        });

        return created ? stockInId : null;
      },

      receiveStock: (params) => {
        return get().createStockIn({
          lines: [
            {
              ingredientId: params.ingredientId,
              quantity: params.quantity,
              unitCost: params.unitCost,
            },
          ],
          supplierId: params.supplierId,
          supplierName: params.supplierName,
          invoiceNo: params.invoiceNo,
          note: params.note,
          recordExpense: params.recordExpense,
        });
      },

      addSupplier: (supplier) =>
        set(state => ({
          suppliers: [...state.suppliers, { ...supplier, id: uuid.v4() as string }],
        })),

      updateSupplier: (id, updated) =>
        set(state => ({
          suppliers: state.suppliers.map(s => (s.id === id ? { ...s, ...updated } : s)),
        })),

      deleteSupplier: (id) => {
        const { purchaseOrders, stockIns } = get();
        const inUse =
          purchaseOrders.some(po => po.supplierId === id) ||
          stockIns.some(si => si.supplierId === id);
        if (inUse) return false;
        set(state => ({
          suppliers: state.suppliers.filter(s => s.id !== id),
        }));
        return true;
      },

      addOperatingExpense: (params) =>
        set(state => ({
          expenses: [
            ...state.expenses,
            {
              id: uuid.v4() as string,
              timestamp: params.timestamp ?? new Date().toISOString(),
              category: 'OPERATING',
              title: params.title,
              operatingType: params.operatingType,
              totalAmount: params.totalAmount,
              note: params.note,
            },
          ],
        })),

      nextStockOpnameDocumentNo: () => {
        const { stockOpnames } = get();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const todayCount =
          stockOpnames.filter(s => s.documentNo.includes(date)).length + 1;
        return `SO-${date}-${String(todayCount).padStart(3, '0')}`;
      },

      postStockOpname: (params) => {
        const reason = params.reason?.trim();
        if (!reason) return null;

        const opnameId = uuid.v4() as string;
        const documentNo = get().nextStockOpnameDocumentNo();
        const timestamp = new Date().toISOString();
        const movementNote = params.note?.trim()
          ? `${reason} — ${params.note.trim()}`
          : reason;

        let created = false;

        set(state => {
          let ingredients = [...state.ingredients];
          let movements = [...state.movements];
          const lines: StockOpnameLine[] = [];

          for (const line of params.lines) {
            const ing = ingredients.find(i => i.id === line.ingredientId);
            if (!ing) continue;

            const systemQty = ing.stock;
            const variance = line.countedQty - systemQty;
            const unitCost = ing.costPerUnit;

            if (variance !== 0) {
              ingredients = ingredients.map(i =>
                i.id === line.ingredientId ? { ...i, stock: line.countedQty } : i
              );
              movements.push(
                addStockMovement(state, {
                  ingredientId: line.ingredientId,
                  type: variance > 0 ? 'IN' : 'OUT',
                  reason: 'STOCK_OPNAME',
                  quantityDiff: variance,
                  note: movementNote || `Opname ${documentNo}`,
                  referenceId: opnameId,
                })
              );
            } else {
              ingredients = ingredients.map(i =>
                i.id === line.ingredientId ? { ...i, stock: line.countedQty } : i
              );
            }

            lines.push({
              ingredientId: line.ingredientId,
              ingredientName: ing.name,
              systemQty,
              countedQty: line.countedQty,
              variance,
              unitCost,
              varianceValue: variance * unitCost,
            });
          }

          if (!lines.length) return state;

          created = true;
          const doc: StockOpnameDocument = {
            id: opnameId,
            documentNo,
            timestamp,
            reason,
            lines,
            note: params.note,
          };

          return {
            ingredients,
            movements,
            stockOpnames: [...state.stockOpnames, doc],
          };
        });

        return created ? opnameId : null;
      },

      nextPurchaseOrderDocumentNo: () => {
        const { purchaseOrders } = get();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const todayCount =
          purchaseOrders.filter(p => p.documentNo.includes(date)).length + 1;
        return `PO-${date}-${String(todayCount).padStart(3, '0')}`;
      },

      createPurchaseOrder: (params) => {
        const poId = uuid.v4() as string;
        const documentNo = get().nextPurchaseOrderDocumentNo();
        const timestamp = new Date().toISOString();
        const supplierFromMaster = params.supplierId
          ? get().suppliers.find(s => s.id === params.supplierId)
          : undefined;

        set(state => {
          const lines: PurchaseOrderLine[] = [];
          for (const line of params.lines) {
            const ing = state.ingredients.find(i => i.id === line.ingredientId);
            if (!ing || line.quantity <= 0 || line.unitCost < 0) continue;
            lines.push({
              ingredientId: line.ingredientId,
              ingredientName: ing.name,
              quantity: line.quantity,
              unitCost: line.unitCost,
              lineTotal: line.quantity * line.unitCost,
            });
          }
          if (!lines.length) return state;

          const po: PurchaseOrder = {
            id: poId,
            documentNo,
            timestamp,
            supplierId: params.supplierId,
            supplierName: supplierFromMaster?.name ?? params.supplierName,
            status: 'DRAFT',
            lines,
            totalAmount: lines.reduce((s, l) => s + l.lineTotal, 0),
            note: params.note,
          };

          return { purchaseOrders: [...state.purchaseOrders, po] };
        });

        return poId;
      },

      receivePurchaseOrder: (purchaseOrderId, recordExpense = true) => {
        const po = get().purchaseOrders.find(p => p.id === purchaseOrderId);
        if (!po || po.status !== 'DRAFT') return null;

        return get().createStockIn({
          lines: po.lines.map(l => ({
            ingredientId: l.ingredientId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          note: po.note,
          recordExpense,
          purchaseOrderId,
        });
      },

      cancelPurchaseOrder: (purchaseOrderId) => {
        const po = get().purchaseOrders.find(p => p.id === purchaseOrderId);
        if (!po || po.status !== 'DRAFT') return false;
        set(state => ({
          purchaseOrders: state.purchaseOrders.map(p =>
            p.id === purchaseOrderId
              ? { ...p, status: 'CANCELED' as PurchaseOrderStatus }
              : p
          ),
        }));
        return true;
      },

      recordWaste: ({ ingredientId, quantity, note }) => {
        if (quantity <= 0) return;
        set(state => {
          const ing = state.ingredients.find(i => i.id === ingredientId);
          if (!ing || ing.stock < quantity) return state;

          const movement = addStockMovement(state, {
            ingredientId,
            type: 'OUT',
            reason: 'WASTE',
            quantityDiff: -quantity,
            note: note || 'Waste / spoilage',
          });

          return {
            ingredients: state.ingredients.map(i =>
              i.id === ingredientId ? { ...i, stock: i.stock - quantity } : i
            ),
            movements: [...state.movements, movement],
          };
        });
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
      deleteProduct: (id) => {
        const product = get().products.find(p => p.id === id);
        if (product?.imageUri) {
          void removeProductImageFile(product.imageUri);
        }
        set(state => ({
          products: state.products.filter(p => p.id !== id),
        }));
      },

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
              note: `Tx: ${id.substring(0, 8).toUpperCase()}`
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
            note: `Void ${actualQtyToVoid}x ${item.name} (Tx: ${txId.substring(0, 8).toUpperCase()}...)`
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

      addTableZone: (name) =>
        set(state => {
          const trimmed = name.trim();
          if (!trimmed || state.tableZones.includes(trimmed)) return state;
          return { tableZones: [...state.tableZones, trimmed] };
        }),

      removeTableZone: (name) =>
        set(state => ({
          tableZones: state.tableZones.filter(z => z !== name),
        })),

      addDiningTable: (table) =>
        set(state => ({
          diningTables: [
            ...state.diningTables,
            {
              ...table,
              id: uuid.v4() as string,
              sortOrder: state.diningTables.length,
            },
          ],
        })),

      addDiningTablesBulk: ({ baseName, count, zone }) => {
        const base = baseName.trim();
        const qty = Math.min(Math.max(Math.floor(count), 1), 99);
        if (!base || !zone.trim()) return 0;

        const bulkName = (index: number) => {
          if (base.length <= 3 && !/\s/.test(base)) return `${base}${index}`;
          return `${base} ${index}`;
        };

        set(state => {
          const startOrder = state.diningTables.length;
          const newTables = Array.from({ length: qty }, (_, i) => ({
            id: uuid.v4() as string,
            name: bulkName(i + 1),
            zone: zone.trim(),
            sortOrder: startOrder + i,
          }));
          return { diningTables: [...state.diningTables, ...newTables] };
        });
        return qty;
      },

      updateDiningTable: (id, updates) =>
        set(state => ({
          diningTables: state.diningTables.map(t =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteDiningTable: (id) =>
        set(state => ({
          diningTables: state.diningTables.filter(t => t.id !== id),
          tableOrders: state.tableOrders.filter(o => o.tableId !== id),
        })),

      getTableOrderForTable: (tableId) => {
        const { tableOrders } = get();
        return tableOrders.find(o => o.tableId === tableId);
      },

      nextTableOrderDocumentNo: () => {
        const { tableOrders } = get();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const todayCount =
          tableOrders.filter(o => o.documentNo.includes(date)).length + 1;
        return `OR-${date}-${String(todayCount).padStart(3, '0')}`;
      },

      upsertOpenTableOrder: (params) => {
        const now = new Date().toISOString();
        const paid = get().tableOrders.find(
          o => o.tableId === params.tableId && o.status === 'PAID'
        );
        if (paid) return paid.id;

        const existing = get().tableOrders.find(
          o => o.tableId === params.tableId && o.status === 'OPEN'
        );
        if (existing) {
          const lines = params.mergeLines
            ? mergeTableOrderLines(existing.lines, params.lines)
            : params.lines;
          set(state => ({
            tableOrders: state.tableOrders.map(o =>
              o.id === existing.id
                ? {
                    ...o,
                    lines,
                    orderNote:
                      params.orderNote !== undefined
                        ? params.orderNote
                        : o.orderNote,
                    updatedAt: now,
                  }
                : o
            ),
          }));
          return existing.id;
        }

        const orderId = uuid.v4() as string;
        const documentNo = get().nextTableOrderDocumentNo();
        const order: TableOrder = {
          id: orderId,
          tableId: params.tableId,
          documentNo,
          createdAt: now,
          updatedAt: now,
          status: 'OPEN',
          lines: params.lines,
          orderNote: params.orderNote,
        };
        set(state => ({
          tableOrders: [...state.tableOrders, order],
        }));
        return orderId;
      },

      markTableOrderPaid: (tableOrderId, transactionId) =>
        set(state => ({
          tableOrders: state.tableOrders.map(o =>
            o.id === tableOrderId
              ? {
                  ...o,
                  status: 'PAID' as TableOrderStatus,
                  transactionId,
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        })),

      clearTable: (tableId) =>
        set(state => ({
          tableOrders: state.tableOrders.filter(o => o.tableId !== tableId),
        })),

      resetAllData: async () => {
        const logoUri = get().storeSettings.logoUri;
        await usePosStore.persist.clearStorage();
        set({
          ingredients: [],
          recipes: [],
          categories: [],
          products: [],
          transactions: [],
          movements: [],
          modifiers: [],
          expenses: [],
          stockIns: [],
          suppliers: [],
          purchaseOrders: [],
          stockOpnames: [],
          tableZones: [...DEFAULT_TABLE_ZONES],
          diningTables: [],
          tableOrders: [],
          storeSettings: { ...DEFAULT_STORE_SETTINGS },
          connectedPrinter: null,
        });
        const { removeStoreLogoFile } = await import('../utils/storeLogo');
        await removeStoreLogoFile(logoUri);
      },
    }),
    {
      name: 'pos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 7,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as {
          categories?: { id: string; name: string; color?: string }[];
          storeSettings?: Partial<StoreSettings>;
          modifiers?: ProductModifier[];
          expenses?: Expense[];
          stockIns?: StockInDocument[];
          suppliers?: Supplier[];
          purchaseOrders?: PurchaseOrder[];
          stockOpnames?: StockOpnameDocument[];
          tableZones?: string[];
          diningTables?: DiningTable[];
          tableOrders?: TableOrder[];
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
        if (!state.stockIns) state.stockIns = [];
        if (!state.suppliers) state.suppliers = [];
        if (!state.purchaseOrders) state.purchaseOrders = [];
        if (!state.stockOpnames) state.stockOpnames = [];
        if (!state.tableZones?.length) state.tableZones = [...DEFAULT_TABLE_ZONES];
        if (!state.diningTables) state.diningTables = [];
        if (!state.tableOrders) state.tableOrders = [];
        if (state.expenses) {
          state.expenses = state.expenses.map(e => ({
            ...e,
            category: e.category ?? 'INVENTORY',
            totalAmount: e.totalAmount ?? 0,
          }));
        } else {
          state.expenses = [];
        }
        if (state.stockOpnames) {
          state.stockOpnames = state.stockOpnames.map(o => ({
            ...o,
            reason: o.reason ?? 'Stock count',
          }));
        }
        return state as never;
      },
    }
  )
);
