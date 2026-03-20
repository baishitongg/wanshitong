"use client";

import { create } from "zustand";

export interface CartProduct {
    id: string;
    name: string;
    price: number | string;
    imageUrl?: string | null;
    stock: number;
}

export interface CartItem {
    id: string; // cartItem id from DB
    productId: string;
    quantity: number;
    product: CartProduct;
}

interface CartStore {
    items: CartItem[];
    loading: boolean;

    fetchCart: () => Promise<void>;
    addItem: (product: CartProduct, quantity?: number) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    removeItem: (productId: string) => Promise<void>;
    clearCart: () => Promise<void>;

    // local-only reset, useful on logout
    resetCart: () => void;

    totalItems: () => number;
    totalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    loading: false,

    fetchCart: async () => {
        set({ loading: true });

        try {
            const res = await fetch("/api/cart", {
                method: "GET",
                cache: "no-store",
            });

            if (!res.ok) {
                set({ items: [] });
                return;
            }

            const data = await res.json();
            set({ items: data?.items ?? [] });
        } catch (error) {
            console.error("[cart] fetchCart error:", error);
            set({ items: [] });
        } finally {
            set({ loading: false });
        }
    },

    addItem: async (product, quantity = 1) => {
        const current = get().items;
        const existing = current.find((item) => item.productId === product.id);

        const nextQuantity = Math.min(
            existing ? existing.quantity + quantity : quantity,
            product.stock
        );

        // optimistic update
        set({
            items: existing
                ? current.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: nextQuantity }
                        : item
                )
                : [
                    ...current,
                    {
                        id: `temp-${product.id}`,
                        productId: product.id,
                        quantity: nextQuantity,
                        product,
                    },
                ],
        });

        try {
            const res = await fetch("/api/cart", {
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
                set({ items: current });
                return;
            }

            const dbItem: CartItem = await res.json();

            set((state) => ({
                items: state.items.map((item) =>
                    item.productId === product.id ? dbItem : item
                ),
            }));
        } catch (error) {
            console.error("[cart] addItem error:", error);
            set({ items: current });
        }
    },

    updateQuantity: async (productId, quantity) => {
        const current = get().items;

        if (quantity <= 0) {
            await get().removeItem(productId);
            return;
        }

        // optimistic update
        set({
            items: current.map((item) =>
                item.productId === productId ? { ...item, quantity } : item
            ),
        });

        try {
            const res = await fetch("/api/cart", {
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
                set({ items: current });
                return;
            }

            const dbItem: CartItem = await res.json();

            set((state) => ({
                items: state.items.map((item) =>
                    item.productId === productId ? dbItem : item
                ),
            }));
        } catch (error) {
            console.error("[cart] updateQuantity error:", error);
            set({ items: current });
        }
    },

    removeItem: async (productId) => {
        const current = get().items;

        // optimistic update
        set({
            items: current.filter((item) => item.productId !== productId),
        });

        try {
            const res = await fetch(`/api/cart/${productId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                set({ items: current });
            }
        } catch (error) {
            console.error("[cart] removeItem error:", error);
            set({ items: current });
        }
    },

    clearCart: async () => {
        const current = get().items;

        // optimistic update
        set({ items: [] });

        try {
            const res = await fetch("/api/cart", {
                method: "DELETE",
            });

            if (!res.ok) {
                set({ items: current });
            }
        } catch (error) {
            console.error("[cart] clearCart error:", error);
            set({ items: current });
        }
    },

    resetCart: () => set({ items: [] }),

    totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

    totalPrice: () =>
        get().items.reduce(
            (sum, item) => sum + Number(item.product.price) * item.quantity,
            0
        ),
}));