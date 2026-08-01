import ShopHowToUsePage from "@/components/ShopHowToUsePage";
import { requireShopBySlug } from "@/lib/shops";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function ShopHowToUseRoutePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await requireShopBySlug(shopSlug);

  return <ShopHowToUsePage shop={shop} />;
}
