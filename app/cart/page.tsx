import { redirect } from "next/navigation";
import ShopCartPage from "@/components/ShopCartPage";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";
import { getShopForCurrentDomain } from "@/lib/server/domainShop";
import { resolveShopTheme } from "@/lib/shopTheme";

export default async function LegacyCartPage() {
  const domainShop = await getShopForCurrentDomain();

  if (domainShop) {
    const theme = resolveShopTheme(domainShop);

    return (
      <ShopCartPage
        shopSlug={domainShop.slug}
        shopName={domainShop.name}
        theme={theme}
        supportWhatsApp={domainShop.whatsappPhone}
        supportTelegram={domainShop.telegramUsername}
        storefrontBasePath=""
      />
    );
  }

  redirect(`/shops/${DEFAULT_SHOP_SLUG}/cart`);
}
