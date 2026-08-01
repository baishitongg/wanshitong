import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export function normalizeRequestDomain(host: string | null) {
  const domain = host
    ?.trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];

  if (!domain || domain === "localhost" || domain === "127.0.0.1") {
    return null;
  }

  return domain;
}

export async function getShopForCurrentDomain() {
  const storefront = await getStorefrontForCurrentDomain();

  return storefront?.kind === "direct-shop" ? storefront.shop : null;
}

export async function getStorefrontForCurrentDomain() {
  const domain = normalizeRequestDomain((await headers()).get("host"));

  if (!domain) {
    return null;
  }

  const partnerChannel = await prisma.partnerChannel.findFirst({
    where: {
      domain,
      isActive: true,
      shop: {
        status: "ACTIVE",
      },
      OR: [
        { promotedShopId: null },
        {
          promotedShop: {
            status: "ACTIVE",
          },
        },
      ],
    },
    include: {
      shop: true,
      promotedShop: true,
    },
  });

  if (partnerChannel) {
    const { shop, promotedShop, ...channel } = partnerChannel;
    const shops = promotedShop && promotedShop.id !== shop.id ? [shop, promotedShop] : [shop];

    return {
      kind: "partner-channel" as const,
      partnerChannel: channel,
      partnerShop: shop,
      promotedShop,
      shops,
    };
  }

  const shop = await prisma.shop.findFirst({
    where: {
      domain,
      status: "ACTIVE",
    },
  });

  return shop
    ? {
        kind: "direct-shop" as const,
        shop,
        partnerChannel: null,
      }
    : null;
}
