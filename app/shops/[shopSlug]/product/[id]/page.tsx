import ShopProductDetailPage from "@/components/ShopProductDetailPage";
import { requireShopBySlug } from "@/lib/shops";

interface Props {
  params: Promise<{ shopSlug: string; id: string }>;
}

export default async function ShopProductDetailRoutePage({ params }: Props) {
  const { shopSlug, id } = await params;
  const shop = await requireShopBySlug(shopSlug);

  return <ShopProductDetailPage shop={shop} productId={id} />;
}
