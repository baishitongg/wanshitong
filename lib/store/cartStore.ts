import { create } from "zustand";

export interface CartProduct {
    id: string;
    name: string;
    price: number | string;
    imageUrl?: string | null;
    stock: number;
}

export interface CartItem {
    id: string;         // cartItem id from DB
    productId: string;
    quantity: number;
    product: CartProduct;
}

interface CartStore {
    items: CartItem[];
    loading: boolean;

    // Load cart from DB (call on mount when user is logged in)
    fetchCart: () => Promise<void>;

    // Add or update quantity in DB
    addItem: (product: CartProduct, quantity?: number) => Promise<void>;

    // Update quantity in DB
    updateQuantity: (productId: string, quantity: number) => Promise<void>;

    // Remove single item from DB
    removeItem: (productId: string) => Promise<void>;

    // Clear all items (called after order placed)
    clearCart: () => void;

    // Derived helpers
    totalItems: () => number;
    totalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    loading: false,

    fetchCart: async () => {
        set({ loading: true });
        try {
            const res = await fetch("/api/cart");
            if (res.ok) {
                const data = await res.json();
                set({ items: data.items ?? [] });
            }
        } catch (e) {
            console.error("[cart] fetch error:", e);
        } finally {
            set({ loading: false });
        }
    },

    addItem: async (product, quantity = 1) => {
        // Optimistic update
        const current = get().items;
        const existing = current.find((i) => i.productId === product.id);
        const newQty = existing ? existing.quantity + quantity : quantity;

        set({
            items: existing
                ? current.map((i) =>
                    i.productId === product.id ? { ...i, quantity: newQty } : i
                )
                : [
                    ...current,
                    {
                        id: "temp-" + product.id,
                        productId: product.id,
                        quantity: newQty,
                        product,
                    },
                ],
        });

        // Sync to DB
        try {
            const res = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, quantity: newQty }),
            });
            if (res.ok) {
                const item = await res.json();
                // Replace temp item with real DB item
                set((state) => ({
                    items: state.items.map((i) =>
                        i.productId === product.id ? { ...item, product } : i
                    ),
                }));
            } else {
                // Revert on failure
                set({ items: current });
            }
        } catch {
            set({ items: current });
        }
    },

    updateQuantity: async (productId, quantity) => {
        const current = get().items;

        if (quantity <= 0) {
            get().removeItem(productId);
            return;
        }

        // Optimistic
        set({
            items: current.map((i) =>
                i.productId === productId ? { ...i, quantity } : i
            ),
        });

        try {
            const res = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, quantity }),
            });
            if (!res.ok) set({ items: current });
        } catch {
            set({ items: current });
        }
    },

    removeItem: async (productId) => {
        const current = get().items;

        // Optimistic
        set({ items: current.filter((i) => i.productId !== productId) });

        try {
            const res = await fetch(`/api/cart/${productId}`, { method: "DELETE" });
            if (!res.ok) set({ items: current });
        } catch {
            set({ items: current });
        }
    },

    clearCart: () => set({ items: [] }),

    totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

    totalPrice: () =>
        get().items.reduce(
            (sum, i) => sum + Number(i.product.price) * i.quantity,
            0
        ),
}));