import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SHOP = {
  slug: "wanshitong",
  name: "Wanshitong",
  description: "Default seeded shop for existing storefront data.",
  heroTitle: "Wanshitong",
  heroSubtitle: "Multi-shop platform default storefront",
};

const BASE_SHOPS = [
  DEFAULT_SHOP,
  {
    slug: "zhongguo-chaoshi",
    name: "中国超市",
    description: "正宗中国商品，品种齐全，物美价廉。",
    heroTitle: "中国超市",
    heroSubtitle: "正宗中国商品，就在您身边",
    heroImageUrl:
      "https://zmlbzrkxejcfvingnead.supabase.co/storage/v1/object/public/product/products/Gemini_Generated_Image_g649erg649erg649.png",
  },
];

async function main() {
  for (const shop of BASE_SHOPS) {
    await prisma.shop.upsert({
      where: { slug: shop.slug },
      update: {
        name: shop.name,
        description: shop.description,
        heroTitle: shop.heroTitle,
        heroSubtitle: shop.heroSubtitle,
        heroImageUrl: shop.heroImageUrl ?? null,
        status: "ACTIVE",
      },
      create: {
        ...shop,
        status: "ACTIVE",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
