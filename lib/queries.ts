import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Cached product list — revalidates every 60 seconds.
 * No DB hit on every page navigation.
 */
export const getCachedProducts = unstable_cache(
    async () => {
        const products = await prisma.product.findMany({
            where: { status: true },
            include: { category: true },
            orderBy: { createdAt: "desc" },
        });
        // Coerce Decimal → number for JSON serialisation
        return products.map((p) => ({
            ...p,
            price: Number(p.price),
        }));
    },
    ["products-list"],
    { revalidate: 60, tags: ["products"] }
);

/**
 * Cached categories — rarely changes, 5 min TTL.
 */
export const getCachedCategories = unstable_cache(
    async () => prisma.category.findMany({ orderBy: { name: "asc" } }),
    ["categories-list"],
    { revalidate: 300, tags: ["categories"] }
);

/**
 * Single product — cache per ID, 60s TTL.
 */
export const getCachedProduct = unstable_cache(
    async (id: string) => {
        const product = await prisma.product.findUnique({
            where: { id },
            include: { category: true },
        });
        if (!product) return null;
        return { ...product, price: Number(product.price) };
    },
    ["product-single"],
    { revalidate: 60, tags: ["products"] }
);