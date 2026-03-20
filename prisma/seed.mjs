import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SHOP = {
  slug: "wanshitong",
  name: "Wanshitong",
  description: "Default seeded shop for existing storefront data.",
  heroTitle: "Wanshitong",
  heroSubtitle: "Multi-shop platform default storefront",
};

async function main() {
  await prisma.shop.upsert({
    where: { slug: DEFAULT_SHOP.slug },
    update: {
      name: DEFAULT_SHOP.name,
      description: DEFAULT_SHOP.description,
      heroTitle: DEFAULT_SHOP.heroTitle,
      heroSubtitle: DEFAULT_SHOP.heroSubtitle,
      status: "ACTIVE",
    },
    create: DEFAULT_SHOP,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
