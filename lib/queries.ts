import { prisma } from "@/lib/prisma";
import { deleteRedisKeys, getJsonCache, setJsonCache } from "@/lib/redis";
import { serializeProduct } from "@/lib/shops";

const PRODUCT_LIST_TTL_SECONDS = 60;
const PRODUCT_DETAIL_TTL_SECONDS = 60;
const CATEGORY_LIST_TTL_SECONDS = 300;

function productListKey(shopSlug: string) {
  return `shop:${shopSlug}:products`;
}

function productDetailKey(shopSlug: string, id: string) {
  return `shop:${shopSlug}:product:${id}`;
}

function categoryListKey(shopSlug: string) {
  return `shop:${shopSlug}:categories`;
}

export async function getCachedProducts(shopSlug: string) {
  const key = productListKey(shopSlug);
  const cached = await getJsonCache<Awaited<ReturnType<typeof getProductsFromDb>>>(key);

  if (cached !== undefined) {
    return cached;
  }

  const products = await getProductsFromDb(shopSlug);
  await setJsonCache(key, products, PRODUCT_LIST_TTL_SECONDS);

  return products;
}

export async function getCachedCategories(shopSlug: string) {
  const key = categoryListKey(shopSlug);
  const cached = await getJsonCache<Awaited<ReturnType<typeof getCategoriesFromDb>>>(key);

  if (cached !== undefined) {
    return cached;
  }

  const categories = await getCategoriesFromDb(shopSlug);
  await setJsonCache(key, categories, CATEGORY_LIST_TTL_SECONDS);

  return categories;
}

export async function getCachedProduct(shopSlug: string, id: string) {
  const key = productDetailKey(shopSlug, id);
  const cached = await getJsonCache<Awaited<ReturnType<typeof getProductFromDb>>>(key);

  if (cached !== undefined) {
    return cached;
  }

  const product = await getProductFromDb(shopSlug, id);
  await setJsonCache(key, product, PRODUCT_DETAIL_TTL_SECONDS);

  return product;
}

export async function invalidateShopProductCache(shopSlug: string, productId?: string) {
  await deleteRedisKeys([
    productListKey(shopSlug),
    ...(productId ? [productDetailKey(shopSlug, productId)] : []),
  ]);
}

export async function invalidateShopCategoryCache(shopSlug: string) {
  await deleteRedisKeys([categoryListKey(shopSlug), productListKey(shopSlug)]);
}

async function getProductsFromDb(shopSlug: string) {
  const products = await prisma.product.findMany({
    where: {
      status: true,
      shop: { slug: shopSlug },
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return products.map(serializeProduct);
}

async function getCategoriesFromDb(shopSlug: string) {
  return prisma.category.findMany({
    where: {
      shop: { slug: shopSlug },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

async function getProductFromDb(shopSlug: string, id: string) {
  const product = await prisma.product.findFirst({
    where: {
      id,
      shop: { slug: shopSlug },
    },
    include: { category: true },
  });

  if (!product) return null;

  return serializeProduct(product);
}
