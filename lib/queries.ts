import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/shops";

export const getCachedProducts = unstable_cache(
  async (shopSlug: string) => {
    const products = await prisma.product.findMany({
      where: {
        status: true,
        shop: { slug: shopSlug },
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return products.map(serializeProduct);
  },
  ["products-list"],
  { revalidate: 60, tags: ["products"] },
);

export const getCachedCategories = unstable_cache(
  async (shopSlug: string) =>
    prisma.category.findMany({
      where: {
        shop: { slug: shopSlug },
      },
      orderBy: { name: "asc" },
    }),
  ["categories-list"],
  { revalidate: 300, tags: ["categories"] },
);

export const getCachedProduct = unstable_cache(
  async (shopSlug: string, id: string) => {
    const product = await prisma.product.findFirst({
      where: {
        id,
        shop: { slug: shopSlug },
      },
      include: { category: true },
    });

    if (!product) return null;

    return serializeProduct(product);
  },
  ["product-single"],
  { revalidate: 60, tags: ["products"] },
);
