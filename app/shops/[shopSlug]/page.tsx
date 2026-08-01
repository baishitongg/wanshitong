import ShopHomePage from "@/components/ShopHomePage";
import { requireShopBySlug } from "@/lib/shops";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function ShopHomeRoutePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await requireShopBySlug(shopSlug);

  return <ShopHomePage shop={shop} />;
}
