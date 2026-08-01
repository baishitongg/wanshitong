import ShopCategoryPage from "@/components/ShopCategoryPage";
import { requireShopBySlug } from "@/lib/shops";

interface Props {
  params: Promise<{ shopSlug: string; id: string }>;
}

export default async function ShopCategoryRoutePage({ params }: Props) {
  const { shopSlug, id } = await params;
  const shop = await requireShopBySlug(shopSlug);

  return <ShopCategoryPage shop={shop} categoryId={id} />;
}
