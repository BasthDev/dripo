import { create } from 'zustand';
import { Product } from './usePosStore';
import { getModifierPriceDelta } from '../utils/modifierUtils';
import { usePosStore } from './usePosStore';

export interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  note?: string;
  modifierIds?: string[];
}

function modifierKey(ids?: string[]) {
  return (ids ?? []).slice().sort().join(',');
}

export function getCartLineUnitPrice(item: CartItem): number {
  const modifiers = usePosStore.getState().modifiers;
  return item.product.sellPrice + getModifierPriceDelta(item.modifierIds ?? [], modifiers);
}

interface CartState {
  items: CartItem[];
  orderNote: string;
  addItem: (product: Product, quantity?: number, modifierIds?: string[]) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemNote: (cartItemId: string, note: string) => void;
  updateItemModifiers: (cartItemId: string, modifierIds: string[]) => void;
  setOrderNote: (note: string) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  refreshFromStore: () => void;
  getTotal: () => number;
  getCartItemsForCheck: () => { productId: string; quantity: number; modifierIds?: string[] }[];
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderNote: '',

  addItem: (product, quantity = 1, modifierIds) =>
    set((state) => {
      const key = modifierKey(modifierIds);
      const existing = state.items.find(
        (i) => i.product.id === product.id && modifierKey(i.modifierIds) === key
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.cartItemId === existing.cartItemId
              ? { ...i, quantity: i.quantity + quantity, product }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            cartItemId: Math.random().toString(36).substring(7),
            product,
            quantity,
            modifierIds: modifierIds?.length ? modifierIds : undefined,
          },
        ],
      };
    }),

  updateQuantity: (cartItemId, quantity) =>
    set((state) => ({
      items: state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)),
    })),

  updateItemNote: (cartItemId, note) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === cartItemId ? { ...i, note: note.trim() || undefined } : i
      ),
    })),

  updateItemModifiers: (cartItemId, modifierIds) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === cartItemId
          ? { ...i, modifierIds: modifierIds.length ? modifierIds : undefined }
          : i
      ),
    })),

  setOrderNote: (note) => set({ orderNote: note }),

  removeItem: (cartItemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.cartItemId !== cartItemId),
    })),

  clearCart: () => set({ items: [], orderNote: '' }),

  refreshFromStore: () =>
    set((state) => {
      const products = usePosStore.getState().products;
      return {
        items: state.items.map((item) => {
          const live = products.find((p) => p.id === item.product.id);
          return live ? { ...item, product: live } : item;
        }),
      };
    }),

  getTotal: () =>
    get().items.reduce(
      (sum, item) => sum + getCartLineUnitPrice(item) * item.quantity,
      0
    ),

  getCartItemsForCheck: () =>
    get().items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      modifierIds: i.modifierIds,
    })),
}));
