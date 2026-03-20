import { requireShopBySlug } from "@/lib/shops";
import ShopCartPage from "@/components/ShopCartPage";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function ShopCartRoutePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await requireShopBySlug(shopSlug);

  return <ShopCartPage shopSlug={shop.slug} shopName={shop.name} />;
}
