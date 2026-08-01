import { redirect } from "next/navigation";
import ShopProductDetailPage from "@/components/ShopProductDetailPage";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";
import { getShopForCurrentDomain } from "@/lib/server/domainShop";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacyProductPage({ params }: Props) {
  const { id } = await params;
  const domainShop = await getShopForCurrentDomain();

  if (domainShop) {
    return (
      <ShopProductDetailPage
        shop={domainShop}
        productId={id}
        storefrontBasePath=""
        showPlatformLink={false}
      />
    );
  }

  redirect(`/shops/${DEFAULT_SHOP_SLUG}/product/${id}`);
}
