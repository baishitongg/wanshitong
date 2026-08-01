import { redirect } from "next/navigation";
import ShopHowToUsePage from "@/components/ShopHowToUsePage";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";
import { getShopForCurrentDomain } from "@/lib/server/domainShop";

export default async function LegacyHowToUsePage() {
  const domainShop = await getShopForCurrentDomain();

  if (domainShop) {
    return (
      <ShopHowToUsePage
        shop={domainShop}
        storefrontBasePath=""
        showPlatformLink={false}
      />
    );
  }

  redirect(`/shops/${DEFAULT_SHOP_SLUG}/how-to-use`);
}
