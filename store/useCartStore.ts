import { create } from 'zustand';
import { Product } from './usePosStore';

export interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  note?: string;
}

interface CartState {
  items: CartItem[];
  orderNote: string;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemNote: (cartItemId: string, note: string) => void;
  setOrderNote: (note: string) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getCartItemsForCheck: () => { productId: string; quantity: number }[];
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderNote: '',

  addItem: (product, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.cartItemId === existing.cartItemId
              ? { ...i, quantity: i.quantity + quantity }
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

  setOrderNote: (note) => set({ orderNote: note }),

  removeItem: (cartItemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.cartItemId !== cartItemId),
    })),

  clearCart: () => set({ items: [], orderNote: '' }),

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0);
  },

  getCartItemsForCheck: () => {
    return get().items.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
  },
}));
