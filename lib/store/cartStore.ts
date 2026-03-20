"use client";

import { useMemo } from "react";
import { create } from "zustand";

export interface CartProduct {
  id: string;
  name: string;
  price: number | string;
  imageUrl?: string | null;
  stock: number;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
}

type ShopCartState = {
  items: CartItem[];
  loading: boolean;
};

const EMPTY_CART_ITEMS: CartItem[] = [];
const EMPTY_SHOP_CART: ShopCartState = {
  items: EMPTY_CART_ITEMS,
  loading: false,
};

interface CartStore {
  carts: Record<string, ShopCartState>;
  fetchCart: (shopSlug: string) => Promise<void>;
  addItem: (
    shopSlug: string,
    product: CartProduct,
    quantity?: number,
  ) => Promise<void>;
  updateQuantity: (
    shopSlug: string,
    productId: string,
    quantity: number,
  ) => Promise<void>;
  removeItem: (shopSlug: string, productId: string) => Promise<void>;
  clearCart: (shopSlug: string) => Promise<void>;
  resetCart: (shopSlug?: string) => void;
}

function getShopCart(
  carts: Record<string, ShopCartState>,
  shopSlug: string,
) {
  return carts[shopSlug] ?? EMPTY_SHOP_CART;
}

function mergeShopCart(
  carts: Record<string, ShopCartState>,
  shopSlug: string,
  next: Partial<ShopCartState>,
) {
  return {
    ...carts,
    [shopSlug]: {
      ...getShopCart(carts, shopSlug),
      ...next,
    },
  };
}

export const useCartStore = create<CartStore>((set, get) => ({
  carts: {},

  fetchCart: async (shopSlug) => {
    set((state) => ({
      carts: mergeShopCart(state.carts, shopSlug, { loading: true }),
    }));

    try {
      const res = await fetch(`/api/shops/${shopSlug}/cart`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        set((state) => ({
          carts: mergeShopCart(state.carts, shopSlug, {
            items: [],
            loading: false,
          }),
        }));
        return;
      }

      const data = (await res.json()) as { items?: CartItem[] };

      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, {
          items: data.items ?? [],
          loading: false,
        }),
      }));
    } catch (error) {
      console.error("[cart] fetchCart error:", error);
      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, {
          items: [],
          loading: false,
        }),
      }));
    }
  },

  addItem: async (shopSlug, product, quantity = 1) => {
    const current = getShopCart(get().carts, shopSlug).items;
    const existing = current.find((item) => item.productId === product.id);

    const nextQuantity = Math.min(
      existing ? existing.quantity + quantity : quantity,
      product.stock,
    );

    set((state) => ({
      carts: mergeShopCart(state.carts, shopSlug, {
        items: existing
          ? current.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: nextQuantity }
                : item,
            )
          : [
              ...current,
              {
                id: `temp-${shopSlug}-${product.id}`,
                productId: product.id,
                quantity: nextQuantity,
                product,
              },
            ],
      }),
    }));

    try {
      const res = await fetch(`/api/shops/${shopSlug}/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: nextQuantity,
        }),
      });

      if (!res.ok) {
        set((state) => ({
          carts: mergeShopCart(state.carts, shopSlug, { items: current }),
        }));
        return;
      }

      const dbItem = (await res.json()) as CartItem;

      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, {
          items: getShopCart(state.carts, shopSlug).items.map((item) =>
            item.productId === product.id ? dbItem : item,
          ),
        }),
      }));
    } catch (error) {
      console.error("[cart] addItem error:", error);
      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, { items: current }),
      }));
    }
  },

  updateQuantity: async (shopSlug, productId, quantity) => {
    const current = getShopCart(get().carts, shopSlug).items;

    if (quantity <= 0) {
      await get().removeItem(shopSlug, productId);
      return;
    }

    set((state) => ({
      carts: mergeShopCart(state.carts, shopSlug, {
        items: current.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        ),
      }),
    }));

    try {
      const res = await fetch(`/api/shops/${shopSlug}/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (!res.ok) {
        set((state) => ({
          carts: mergeShopCart(state.carts, shopSlug, { items: current }),
        }));
        return;
      }

      const dbItem = (await res.json()) as CartItem;

      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, {
          items: getShopCart(state.carts, shopSlug).items.map((item) =>
            item.productId === productId ? dbItem : item,
          ),
        }),
      }));
    } catch (error) {
      console.error("[cart] updateQuantity error:", error);
      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, { items: current }),
      }));
    }
  },

  removeItem: async (shopSlug, productId) => {
    const current = getShopCart(get().carts, shopSlug).items;

    set((state) => ({
      carts: mergeShopCart(state.carts, shopSlug, {
        items: current.filter((item) => item.productId !== productId),
      }),
    }));

    try {
      const res = await fetch(`/api/shops/${shopSlug}/cart/${productId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        set((state) => ({
          carts: mergeShopCart(state.carts, shopSlug, { items: current }),
        }));
      }
    } catch (error) {
      console.error("[cart] removeItem error:", error);
      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, { items: current }),
      }));
    }
  },

  clearCart: async (shopSlug) => {
    const current = getShopCart(get().carts, shopSlug).items;

    set((state) => ({
      carts: mergeShopCart(state.carts, shopSlug, { items: [] }),
    }));

    try {
      const res = await fetch(`/api/shops/${shopSlug}/cart`, {
        method: "DELETE",
      });

      if (!res.ok) {
        set((state) => ({
          carts: mergeShopCart(state.carts, shopSlug, { items: current }),
        }));
      }
    } catch (error) {
      console.error("[cart] clearCart error:", error);
      set((state) => ({
        carts: mergeShopCart(state.carts, shopSlug, { items: current }),
      }));
    }
  },

  resetCart: (shopSlug) =>
    set((state) => {
      if (!shopSlug) {
        return { carts: {} };
      }

      return {
        carts: mergeShopCart(state.carts, shopSlug, {
          items: [],
          loading: false,
        }),
      };
    }),
}));

export function useShopCart(shopSlug: string) {
  const items = useCartStore((state) => getShopCart(state.carts, shopSlug).items);
  const loading = useCartStore(
    (state) => getShopCart(state.carts, shopSlug).loading,
  );
  const fetchCart = useCartStore((state) => state.fetchCart);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const resetCart = useCartStore((state) => state.resetCart);

  return useMemo(
    () => ({
      items,
      loading,
      fetchCart: () => fetchCart(shopSlug),
      addItem: (product: CartProduct, quantity?: number) =>
        addItem(shopSlug, product, quantity),
      updateQuantity: (productId: string, quantity: number) =>
        updateQuantity(shopSlug, productId, quantity),
      removeItem: (productId: string) => removeItem(shopSlug, productId),
      clearCart: () => clearCart(shopSlug),
      resetCart: () => resetCart(shopSlug),
      totalItems: () => items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: () =>
        items.reduce(
          (sum, item) => sum + Number(item.product.price) * item.quantity,
          0,
        ),
    }),
    [
      addItem,
      clearCart,
      fetchCart,
      items,
      loading,
      removeItem,
      resetCart,
      shopSlug,
      updateQuantity,
    ],
  );
}
