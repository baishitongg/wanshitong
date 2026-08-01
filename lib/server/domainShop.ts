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

  return storefront?.shop ?? null;
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
    },
    include: {
      shop: true,
    },
  });

  if (partnerChannel) {
    const { shop, ...channel } = partnerChannel;

    return {
      shop,
      partnerChannel: channel,
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
        shop,
        partnerChannel: null,
      }
    : null;
}
