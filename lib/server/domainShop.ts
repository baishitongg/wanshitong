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
  const domain = normalizeRequestDomain((await headers()).get("host"));

  if (!domain) {
    return null;
  }

  return prisma.shop.findFirst({
    where: {
      domain,
      status: "ACTIVE",
    },
  });
}
